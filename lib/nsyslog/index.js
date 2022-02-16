const
	os = require('os'),
	logger = require("../logger"),
	extend = require('extend'),
	Logger = require("../logger"),
	mingo = require('../mingo'),
	ClusterAware = require("./clusteraware"),
	GlobalDB = require('./globaldb'),
	FileQueue = require("fileq"),
	Reemiter = require("../reemiter"),
	MachineCollector = require('../machine'),
	Config = require("../config"),
	InputWrapper = require("../input/wrapper"),
	Transporters = Config.Transporters,
	Processors = Config.Processors,
	Input = require('../input'),
	Processor = require('../processor'),
	Transporter = require('../transporter'),
	Factory = require("../factory"),
	Cluster = require("../cluster"),
	Stats = require("../stats"),
	PubSub = require("../pubsub"),
	Shm = require("../shm"),
	FlowFork = require("../cluster/flow-master"),
	Streams = require('../stream'),
	{BypassStream,QueueStream,FilterStream} = Streams,
	{vfn,prfn,timer} = require("../util.js");

var heapdump = null;
try {
	heapdump = require('heapdump');
}catch(err) {
	logger.warn('Heapdump not available.');
}

const MODULE = 'nsyslog-core';

/**
 * Main NSyslog class. Defines the core engine, responsible of wire
 * inputs, procesors and transformers into flows
 *
 * @class NSyslog
 * @extends ClusterAware
 * @param {Config} cfg Configuration data
 * @example
 * const NSyslog = require('nsyslog');
 * let cfg = await NSyslog.readConfig('config.json');
 * let nsyslog = new NSyslog(cfg);
 */
class NSyslog extends ClusterAware {
	constructor(cfg) {
		super(cfg, MODULE);

		/** @property {boolean} forked If true, this instances lives in a forked process */
		this.forked = !Cluster.isMaster;

		/** @property {string} datadir Data storage folder */
		this.datadir = this.config.config.datadir || "./db";

		// If we are the master process, split configuration into master and
		// children counterparts. Take only own config
		if(Cluster.isMaster) {
			this.allconfigs = this.config.split();
			this.config = this.allconfigs[Config.MASTER_PROC];
			this.modules = this.config.modules;
			this.globaldb = new GlobalDB(this.datadir);
		}

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
		this.children = [];
		this.flowmap = {};
		this.pubsub = null;

		this.collector = MachineCollector.default;

		Reemiter.configure(this);
	}

	/**
	 * Read, parse and initialize a configuration file
	 *
	 * @param {string} path Config file path
	 * @param {function} callback Callback function
	 * @param {boolean} validateOnly Only validate configuration
	 *
	 * @returns {Promise<Config>} Promise contains the configuration object
	 */
	static readConfig(path,callback,validateOnly) {
		return Config.read(path,callback,validateOnly);
	}

	/**
	 * Replace logger instance by the provided one
	 * @param {Logger} instance Logger instance
	 */
	static setLogger(instance) {
		return logger.setInstance(instance);
	}

	/**
	 * Starts processes for forked flows, creating local
	 * virtual flows that sends data to child processes
	 * @private
	 */
	async startChildren() {
		// Ignore if we are a child process
		if(this.forked) return;

		// If a flow is forked, since it lives in another
		// process, create a "virtual" flow, that sends data
		// to the child process
		this.children = Object.
			keys(this.allconfigs).
			filter(pk=>pk!=Config.MASTER_PROC).
			map(pk=>{
				// Search main flow of the forked process
				let cfg = this.allconfigs[pk];
				let mainFlow = cfg.modules.flows.find(f=>f.id==pk);

				// Initializes streams
				let to = Processors.Init(), from = to;
				let cores = Math.max.apply(Math,this.allconfigs[pk].flows.map(f=>f.cores||1));
				let stream = FlowFork.fork(this.allconfigs[pk],pk,cores);
				to = to.pipe(stream);
				to.pipe(Processors.End());

				// Assign streams to this virtual flow
				mainFlow.pstream = {start:from,end:to};
				mainFlow.tstream = Transporters.Null();
				mainFlow.fstream = stream;
				mainFlow.virtual = true;

				return mainFlow;
			});
	}

	/**
	 * Starts Pub/Sub server
	 * @private
	 */
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

	/**
	 * Configures and initializes the processors stream
	 * @private
	 */
	startProcessorStream() {
		let	cfg = this.config;

		// For each flow, instantiate and pipe the processors
		cfg.modules.flows.filter(f=>!f.disabled).forEach(flow=>{
			var to = Processors.Init(), from = to;

			// Create processor streams and pipe then in serial mode
			flow.processors.
				map(proc=>Factory.transform(proc,flow)).
				forEach(p=>{
					p.instance.own = true;	// Procesor owned by this process
					to = to.pipe(p);				// Pipe streams
				});

			// End of the process part of the flow
			to.pipe(Processors.End());
			flow.pstream = {start:from,end:to};
		});
	}

	/**
	 * Configures and initializes the transporters stream
	 * @private
	 */
	startTransportStream() {
		let	cfg = this.config;

		function walk(trs,flow) {
			if(trs.transport) {
				trs.own = true;	// Transporter owned by this process
				let wr = Factory.writer(trs,flow);
				return wr;
			}
			else if(trs.mode=="serial") {
				let from = Transporters.Null();
				let stream = from;
				trs.list.forEach(tr=>stream = stream.pipe(walk(tr,flow)));
				stream.pipe(Transporters.End());
				return from;
			}
			else if(trs.mode=="parallel") {
				let stream = Transporters.Null();
				trs.list.forEach(tr=>stream.pipe(walk(tr,flow)).pipe(Transporters.End()));
				return stream;
			}
			else {
				throw new Error(`Invalid transporter ${trs.id}`);
			}
		}

		// For each flow, instantiate the transporter streams
		cfg.modules.flows.filter(f=>!f.disabled).forEach(flow=>{
			var trs = flow.transporters;
			flow.tstream = walk(trs,flow);
		});
	}

	/**
	 * Starts all component modules
	 * @private
	 */
	async startModules() {
		let modules = this.config.modules,
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
		let inputStream = this.inputStream,
				cfg = this.config;

		// Active flows (Process and children flows)
		let flows = cfg.modules.flows.concat(this.children).filter(f=>!f.disabled);

		// For each flow, create a queue stream and pipe to processors stream,
		// then, pipe processors stream to transporters stream
		flows.forEach((f,i)=>{
			let wstr = new FilterStream(
				`${f.id}_Entry_Point`,
				//Input matches when direct reemit or filter matches and general or not reemit
				(x)=>(((f.id==x.$$reemit) || (typeof(x.$$reemit)!='string' && f.from(x))) && f.when(x))
			);
			f.stream = wstr;
			f.stream.pipe(f.pstream.start);
			f.pstream.end.pipe(f.tstream);
			inputStream.pipe(f.stream);
		});

		// Register own flows on shared memory
		logger.info(`Process ${process.pid} registers flows:`,flows.map(f=>`${f.id}${f.virtual?'[virtual]':''}`));
		flows.filter(f=>!f.virtual).forEach(f=>Shm.hpush('flows',f.id,this.pubsub.link));
		this.flowmap = flows.reduce((map,f)=>{
			map[f.id] = f;
			return map;
		},{});
	}

	startInputs() {
		let queueStream = this.queueStream,
				bypassStream = this.bypassStream,
				modules = this.modules,
				cfg = this.config;

		// Iterate over every input to start the stream
		Object.keys(cfg.modules.inputs).forEach(k=>{
			let m = cfg.modules.inputs[k];

			// Wraps the input into a writable stream
			let input = new InputWrapper(m);
			input.own = true;
			modules.inputs[k] = input;

			// Start the input and pipe it to the hub stream
			input.start(m.mode==Input.MODE.pull? bypassStream:queueStream,(err)=>{
				if(err)
					logger.error(err);
			});
		});
	}

	async startCollector() {
		let conf = extend(true,{config:{collector:MachineCollector.Defaults}},this.config);
		if(conf.config.collector.enabled!==false) {
			logger.info('Starting machine collector...');
			this.collector.configure(conf.config.collector);
			this.collector.start();
		}
	}

	/**
	 * Pushes data manually to the nsyslog instance, writing them to the input stream,
	 * in order to be sent to the flows
	 * @param {object} entry Entry data to push
	 * @param {string} [flow] Flow to send the data directly to.
	 * @param {function} callback Callback function
	 */
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
		let modules = this.modules;
		logger.info(`Process [${process.pid}] will start with the following components:`);
		logger.info(`\tInputs`,Object.keys(modules.inputs));
		logger.info(`\tProcessors`,Object.keys(modules.processors));
		logger.info(`\tTransporters`,Object.keys(modules.transporters));

		await this.startCollector();
		await this.startPubSub();
		this.startChildren();
		this.startProcessorStream();
		this.startTransportStream();
		await this.startFlowStream();
		await this.startModules();
		this.startInputs();

		this.startHealthCheck();
	}

	async startHealthCheck() {
		this.on('threshold.mem',mem=>{
			logger.debug(`[${process.pid}] Memory: `,mem);
			if(mem.current>mem.max) {
				let f = `${os.tmpdir()}/nsyslog/nsyslog.heapsnapshot`;
				logger.error(`Exceeded memory thresholdt (max: ${mem.max} / current: ${mem.current}). Exiting...`);
				if(mem.heapdump && heapdump) {
					heapdump.writeSnapshot(f,()=>{
						logger.warn(`Heapdump saved as: ${f}`);
						process.exit(1);
					});
				}
				else {
					process.exit(1);
				}
			}
		});
		this.on('threshold.cpu',cpu=>{
			logger.debug(`[${process.pid}] CPU: `,cpu,this.inputStream.throttle);			
			if(cpu.current>(cpu.max+10)) {
				this.inputStream.throttle++;
			}
			else if(cpu.current<(cpu.max-10)) {
				if(this.inputStream.throttle>0)
					this.inputStream.throttle--;
			}
		});
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
		let modules = this.modules,
				inputs = this.modules.inputs,
				procs = this.modules.processors,
				trans = this.modules.transporters;

		logger.info('Closing child processes');
		this.children.forEach(f=>f.fstream.closefork());
		logger.info('Stopping machine collector...');
		this.collector.stop();
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
			// If a child flow doesn't use this input, its value is undefined
			if(modules.inputs[k])
				modules.inputs[k] = modules.inputs[k].instance;
		});

		logger.info('All modules stopped');

		// Wait for pending log messages to be sent (awful workaround)
		await timer(100);
	}

	async destroy() {
		await this.stop();
		Cluster.removeAllListeners(MODULE);
		this.emit('destroy',this);
	}
}

/**
 * NSyslog core modules
 * @namespace
 */
NSyslog.Core = {
	/** @type {Config} */
	Config,
	/** @type {Input} */
	Input,
	/** @type {Transporter} */
	Transporter,
	/** @type {Processor} */
	Processor,
	/** @type {Factory} */
	Factory,
	/** @type {InputWrapper} */
	InputWrapper,
	/** @type {Streams} */
	Streams,
	/** @type {Stats} */
	Stats,
	/** @type {SharedMem} */
	Shm
};

module.exports = NSyslog;
