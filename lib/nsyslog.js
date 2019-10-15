const
	logger = require("./logger"),
	extend = require("extend"),
	mingo = require('./mingo'),
	EventEmiter = require("events"),
	FileQueue = require("fileq"),
	Reemiter = require("./reemiter"),
	Config = require("./config"),
	BypassStream = require("./stream/bypasstream"),
	QueueStream = require("./stream/queuestream"),
	FilterStream = require("./stream/filterstream"),
	InputWrapper = require("./input/wrapper"),
	Transporters = Config.Transporters,
	Processors = Config.Processors,
	Input = require('./input'),
	Processor = require('./processor'),
	Transporter = require('./transporter'),
	Factory = require("./factory"),
	Cluster = require("./cluster"),
	Stats = require("./stats"),
	PubSub = require("./pubsub"),
	Shm = require("./shm"),
	FlowFork = require("./cluster/flow-master");

const MODULE = 'nsyslog-core';
const CMD = {
	subscribe : 'subscribe',
	unsubscribe : 'unsubscribe'
};

function vfn() {};
function prfn(obj,cmd) {
	return new Promise((ok,rej)=>obj[cmd](err=>err?rej(err):ok()));
};

function subhdl(type,id,mode,entry) {
	process.send({module:MODULE,type,id,mode,entry});
};

/**
 * @class NSyslog
 */
class NSyslog extends EventEmiter {
	/**
	 * @param {Object} cfg Configuration data
	 */
	constructor(cfg) {
		super();

		this.config = cfg;
		this.forked = !Cluster.isMaster;
		this.datadir = this.config.config.datadir || "./db";
		this.modules = extend({inputs : {},	processors : {},	transporters : {}},cfg.modules);
		this.mingo = mingo;

		// Stream for the fileq file buffer
		// If we are a forked flow process, simply use a bypass
		// Else, use a real queueStream
		this.queueStream = this.forked?
			new BypassStream('ForkStream') :
			new QueueStream('PushStream',FileQueue.from('inputs',{path:`${this.datadir}`,truncate:true}));

		// queueStream => Receive data from push inputs
		// bypassStream => Receive data from pull inputs
		// inputStream => Collects data from queue and bypass streams
		this.queueStream.on("error",logger.error.bind(logger));
		this.bypassStream = new BypassStream('PullStream');
		this.inputStream = new BypassStream(`${this.forked? 'Forked_':''}InputStream`);
		this.queueStream.pipe(this.inputStream);
		this.bypassStream.pipe(this.inputStream);
		this.forks = [];
		this.flowmap = {};
		this.pubsub = null;
		this.subscribers = new Map();

		Reemiter.configure(this);
		this.initialize();
	}

	/**
	 * Read, parse and initialize a configuration file
	 *
	 * @param {string} path Config file path
	 * @param {function} callback Callback function
	 * @param {boolean} validateOnly Only validate configuration
	 *
	 * @returns {Promise} Promise contains the configuration object
	 */
	static readConfig(path,callback,validateOnly) {
		return Config.read(path,callback,validateOnly);
	}

	/**
	 * Replace logger instance by the provided one
	 *
	 * @param {object} Logger instance
	 */
	static setLogger(instance) {
		return logger.setInstance(instance);
	}

	initialize() {
		if(Cluster.isMaster) {
			Cluster.on(MODULE,(child,module,msg)=>{
				let key = `${msg.type}@${msg.id}@${msg.mode}`;
				let list = this.subscribers.get(key);
				if(list) {
					for (let cb of list)
						cb(msg.type,msg.id,msg.mode,msg.entry);
				}
			});
		}
		else {
			Cluster.on(MODULE,(process,module,msg)=>{
				try {
					if(msg.cmd==CMD.subscribe) {
						this.subscribe(msg.type,msg.id,msg.mode,subhdl);
					}
					else if(msg.cmd==CMD.unsubscribe) {
						this.unsubscribe(msg.type,msg.id,msg.mode,subhdl);
					}
				}catch(err){
					logger.error(err);
				}
			});
		}
	}

	subscribe(type,id,mode,handler) {
		let key = `${type}@${id}@${mode}`;
		if(!this.subscribers.has(key)) {
			this.subscribers.set(key,new Set());
		}
		let list = this.subscribers.get(key);

		let mod = this.modules[type][id];
		if(!mod) {
			throw new error(`Component of type "${type}" with ID "${args.id}" doesn't exist`);
		}

		if(type!='inputs')
			mod.streams.forEach(str=>str.subscribe(mode,handler));
		else
			this.inputStream.subscribe(id,handler);

		// Subscribe to child processes
		if(Cluster.isMaster) {
			Cluster.broadcast(MODULE,{cmd:CMD.subscribe,type,id,mode});
		}
	}

	unsubscribe(type,id,mode,handler) {
		let key = `${type}@${id}@${mode}`;
		if(!this.subscribers.has(key)) {
			this.subscribers.set(key,new Set());
		}
		let list = this.subscribers.get(key);

		let mod = this.modules[type][id];
		if(!mod) {
			throw new error(`Component of type "${type}" with ID "${args.id}" doesn't exist`);
		}

		if(type!='inputs')
			mod.streams.forEach(str=>str.unsubscribe(mode,handler));
		else
			this.inputStream.unsubscribe(id,handler);

		list.delete(handler);

		// Unsubscribe to child processes
		if(Cluster.isMaster) {
			Cluster.broadcast(MODULE,{cmd:CMD.unsubscribe,type,id,mode});
		}
	}

	async startPubSub() {
		this.pubsub = new PubSub.Server();
		await this.pubsub.bind('0.0.0.0');
		this.pubsub.on('message',(msg,cb)=>{
			switch(msg.cmd) {
				case 'reemit' :
					let entries = msg.args;
					entries.forEach(entry=>{
						let flowid = entry.$$reemit;
						if(flowid===true) {
							this.queueStream.write(entry,null,err=>{
								cb(err? PubSub.Code.ERR_REEMIT : PubSub.Code.ACK_REEMIT);
							});
						}
						else {
							let flow = this.flowmap[flowid];
							if(flow && !flow.disabled) {
								flow.stream.write(entry,null,err=>{
									cb(err? PubSub.Code.ERR_REEMIT : PubSub.Code.ACK_REEMIT);
								});
							}
						}
					});
					break;
				default :
					logger.warn(`Process ${process.pid} received unknown command ${msg.cmd}`);
					break;
			}
		});
	}

	startProcessorStream() {
		let	cfg = this.config;

		// For each flow, instantiate and pipe the processors
		cfg.flows.filter(f=>!f.disabled).forEach(flow=>{
			var to = Processors.Init(), from = to;

			// Not forked flow
			if(!flow.fork) {
				// Create processor streams and pipe then in serial mode
				flow.processors.
					map(proc=>Factory.transform(proc,flow)).
					forEach(p=>{
						p.instance.own = true;	// Procesor owned by this process
						to = to.pipe(p);				// Pipe streams
					});
			}
			// Forked flow (master, not child)
			else if(!flow.fparent){
				// Fork a new process and pipe it to the flow
				let p = FlowFork.fork(this.config.$file,flow.id,flow.cores,flow.fork);
				to = to.pipe(p);
				this.forks.push(p);
			}

			// End of the process part of the flow
			to.pipe(Processors.End());
			flow.pstream = {start:from,end:to};
		});
	}

	startTransportStream() {
		let	cfg = this.config;

		function walk(trs,flow) {
			if(trs.transport) {
				trs.own = true;	// Transporter owned by this process
				let wr = Factory.writer(trs,flow);
				return wr;
			}
			else if(trs.mode=="serial") {
				var from = stream = Transporters.Null();
				trs.list.forEach(tr=>stream = stream.pipe(walk(tr,flow)));
				stream.pipe(Transporters.End());
				return from;
			}
			else if(trs.mode=="parallel") {
				var stream = Transporters.Null();
				trs.list.forEach(tr=>stream.pipe(walk(tr,flow)).pipe(Transporters.End()));
				return stream;
			}
			else {
				throw new Error(`Invalid transporter ${trs.id}`);
			}
		}

		// For each flow, instantiate the transporter streams
		cfg.flows.filter(f=>!f.disabled).forEach(flow=>{
			// Not forked flow, build the stream tree
			if(!flow.fork) {
				var trs = flow.transporters;
				flow.tstream = walk(trs,flow);
			}
			// Forked flow. As the forked process (created on the processors part)
			// will handle the transporters, do nothing.
			else {
				flow.tstream = Transporters.Null();
			}
		});
	}

	async startModules() {
		let
			modules = this.config.modules,
			trs = modules.transporters,
			prs = modules.processors;

		function start(m) {
			return new Promise((ok,rej)=>{
				if(!m.own) return ok();	// Module not owned by this process
				m.start((err)=>{if(err) rej(err); else ok();});
			});
		}

		try {
			let ptrs = Object.keys(trs).map(id=>start(trs[id]));
			let pprs = Object.keys(prs).map(id=>start(prs[id]));
			await Promise.all([].concat(ptrs).concat(pprs));
			logger.info("All modules started successfuly");
		}catch(err) {
			logger.error("Error starting modules");
			throw err;
		}
	}

	async startFlowStream() {
		let
			inputStream = this.inputStream,
			cfg = this.config;

		// Active flows
		let flows = cfg.flows.filter(f=>!f.disabled);

		// For each flow, create a queue stream and pipe to processors stream,
		// then, pipe processors stream to transporters stream
		flows.forEach((f,i)=>{
			f.id = f.id || `Flow_${i}`;
			let wstr = new FilterStream(
				`${f.id}_Entry_Point`,
				//Input matches when direct reemit or filter matches and general or not reemit
				(x)=>(f.id==x.$$reemit) || (typeof(x.$$reemit)!='string' && f.from(x) && f.when(x))
			);
			f.stream = wstr;
			f.stream.pipe(f.pstream.start);
			f.pstream.end.pipe(f.tstream);
			inputStream.pipe(f.stream);
		});

		// Register own flows on shared memory
		let ownflows = this.forked? flows : flows.filter(f=>!f.fork);
		logger.info(`Process ${process.pid} registers flows:`,ownflows.map(f=>f.id));
		ownflows.forEach(f=>Shm.hpush('flows',f.id,this.pubsub.link));
		this.flowmap = flows.reduce((map,f)=>{
			map[f.id] = f;
			return map;
		},{});
	}

	startInputs() {
		let
			queueStream = this.queueStream,
			bypassStream = this.bypassStream,
			modules = this.modules,
			cfg = this.config;

		// Map flows by fork mode
		let fmap = cfg.flows.reduce((map,f)=>{
			map[f.id] = f.fork || false;
			return map;
		},{});

		// Iterate over every input to start the stream
		Object.keys(cfg.modules.inputs).forEach(k=>{
			let m = cfg.modules.inputs[k];

			// We are the master process and the input is attached to a forked flow
			if(!this.forked) {
				if(m.$def.attach) {
					// Every attached flow must be forked in order to skip input
					// from the master process
					let skip = m.$def.attach.reduce((skip,id)=>skip && (fmap[id]||false),true);
					if(skip) {
						logger.info(`Input ${k} is attached to a forked flow. It won't be started on main process`);
						return;
					}
					else {
						logger.warn(`Input ${k} is attached to a non forked flow. Starting on main process`);
					}
				}
			}

			// Wraps the input into a writable stream
			let input = new InputWrapper(m);
			input.own = true;
			modules.inputs[k] = input;

			// Start the input and pipe it to the hub stream
			input.start(m.mode==MODE.pull? bypassStream:queueStream,(err)=>{
				if(err)
					logger.error(err);
			});
		});
	}

	push(entry,flow,callback) {
		if(!callback) {
			callback = flow;
			flow = null;
		}
		else if(!flow) {
			callback = vfn;
		}

		if(!flow) {
			this.inputStream.write(entry, null, callback);
		}
		else {
			if(typeof(flow)=='string') {
				if(!this.flowmap[flow])
					return callback(`Flow ${flow} doesn't exist`,entry);
				else
					flow = this.flowmap[flow];
			}
			flow.stream.write(entry, null, callback);
		}
	}

	async start() {
		await this.startPubSub();
		this.startProcessorStream();
		this.startTransportStream();
		await this.startFlowStream();
		await this.startModules();
		this.startInputs();
	}

	async pause() {
		let inputs = this.modules.inputs;
		logger.info('Pausing inputs...');
		await Promise.all(
			Object.keys(inputs).map(key=>inputs[key]).map(m=>prfn(m,'pause'))
		);
		logger.info('Inputs paused');
	}

	async resume() {
		let inputs = this.modules.inputs;
		logger.info('Resuming inputs...');
		await Promise.all(
			Object.keys(inputs).map(key=>inputs[key]).map(m=>prfn(m,'resume'))
		);
		logger.info('Resuming inputs...');
	}

	async stop() {
		let
			modules = this.modules,
			inputs = this.modules.inputs,
			procs = this.modules.processors,
			trans = this.modules.transporters;

		logger.info('Closing child processes');
		this.forks.forEach(f=>f.closefork());
		logger.info('Stopping inputs...');
		await Promise.all(Object.keys(inputs).map(key=>inputs[key]).filter(m=>m.own).map(m=>prfn(m,'stop')));
		logger.info('Stopping processors...');
		await Promise.all(Object.keys(procs).map(key=>procs[key]).filter(m=>m.own).map(m=>prfn(m,'stop')));
		logger.info('Stopping transporters...');
		await Promise.all(Object.keys(trans).map(key=>trans[key]).filter(m=>m.own).map(m=>prfn(m,'stop')));
		logger.info('Closing buffer queues...');
		await this.queueStream.close();

		// Restores the wrapped inputs
		Object.keys(modules.inputs).forEach(k=>{
			modules.inputs[k] = modules.inputs[k].instance;
		});

		logger.info('All modules stopped');
	}

	async destroy() {
		await this.stop();
		Cluster.removeAllListeners(MODULE);
		this.emit('destroy',this);
	}
}

NSyslog.Core = {Config, Input, Transporter, Processor, Factory, InputWrapper, Stats};
module.exports = NSyslog;
