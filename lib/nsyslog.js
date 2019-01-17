const
	logger = require("./logger"),
	extend = require("extend"),
	EventEmiter = require("events"),
	FileQueue = require("fileq"),
	Reemiter = require("./reemiter"),
	Config = require("./config"),
	BypassStream = require("./stream/bypasstream"),
	QueueStream = require("./stream/queuestream"),
	FlowStream = require("./stream/flowstream"),
	InputWrapper = require("./input/wrapper"),
	Transform = require("stream").Transform,
	Transporters = Config.Transporters,
	Processors = Config.Processors,
	Input = require('./input'),
	Processor = require('./processor'),
	Transporter = require('./transporter'),
	Factory = require("./factory"),
	Cluster = require("./cluster"),
	Events = require("./component").Events,
	FlowFork = require("./cluster/flow-master");

function prfn(obj,cmd) {
	return new Promise((ok,rej)=>obj[cmd](err=>err?rej(err):ok()));
}

class NSyslog extends EventEmiter {
	constructor(cfg) {
		super();

		this.config = cfg;
		this.forked = !Cluster.isMaster;
		this.datadir = this.config.config.datadir || "./db";
		this.modules = extend({inputs : {},	processors : {},	transporters : {}},cfg.modules);

		// Stream for the fileq file buffer
		this.queueStream = this.forked?
			new BypassStream('ForkStream') :
			new QueueStream('PushStream',FileQueue.from('inputs',{path:`${this.datadir}`,truncate:true}));

		// queueStream => Receive data from push inputs
		// bypassStream => Receive data from pull inputs
		// inputStream => Collects data from queue and bypass streams
		this.queueStream.on("error",logger.error.bind(logger));
		this.bypassStream = new BypassStream('PullStream');
		this.inputStream = new BypassStream('InputStream');
		this.queueStream.pipe(this.inputStream);
		this.bypassStream.pipe(this.inputStream);
		this.forks = [];

		// Set event handlers for ack,emit,fail and transfer
		this.attachEvents(this.queueStream,null,'input');
		this.attachEvents(this.bypassStream,null,'input');
		this.attachEvents(this.inputStream,null,'input');

		Reemiter.setStream(this.inputStream);
	}

	static readConfig(path,callback,validateOnly) {
		return Config.read(path,callback,validateOnly);
	}

	static setLogger(instance) {
		return logger.setInstance(instance);
	}

	async start() {
			this.startProcessorStream();
			this.startTransportStream();
			this.startFlowStream();
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
			inputs = this.modules.inputs,
			procs = this.modules.processors,
			trans = this.modules.transporters;

		logger.info('Stopping inputs...');
		await Promise.all(Object.keys(inputs).map(key=>inputs[key]).map(m=>prfn(m,'stop')));
		logger.info('Stopping processors...');
		await Promise.all(Object.keys(procs).map(key=>procs[key]).map(m=>prfn(m,'stop')));
		logger.info('Stopping transporters...');
		await Promise.all(Object.keys(trans).map(key=>trans[key]).map(m=>prfn(m,'stop')));
		logger.info('Closing buffer queues...');
		await this.queueStream.close();

		logger.info('All modules stopped');
	}

	attachEvents(module,flow,stage) {
		module.on(Events.data,this.handleEvent('data',stage,flow,module));
		module.on(Events.ack,this.handleEvent('ack',stage,flow,module));
		module.on(Events.error,this.handleEvent('error',stage,flow,module));
		module.on(Events.transfer,this.handleEvent('transfer',stage,flow,module));
	}

	handleEvent(event,stage,flow,module) {
		return function(entry,evt) {
			evt = extend({stage,flow,module},evt);
			this.emit('all',event,evt.stage,evt.flow,evt.module,entry,evt.from,evt.to);
			this.emit(event,evt.stage,evt.flow,evt.module,entry,evt.from,evt.to);
		}.bind(this);
	}

	startProcessorStream() {
		let	cfg = this.config;

		cfg.flows.forEach(flow=>{
			var to = Processors.Init(), from = to;
			if(!flow.fork) {
				flow.processors.
				map(proc=>Factory.transform(proc,flow)).
				forEach(p=>{
					this.attachEvents(p,flow,'processor');
					to = to.pipe(p);
				});
			}
			else {
				let p = FlowFork.fork(this.config.$path,flow.id);
				this.attachEvents(p,flow,'processor');
				to = to.pipe(p);
			}
			to.pipe(Processors.End());
			flow.pstream = {start:from,end:to};
		});
	}

	startTransportStream() {
		let self = this;
		let	cfg = this.config;

		function walk(trs,flow) {
			if(trs.transport) {
				let wr = Factory.writer(trs,flow);
				self.attachEvents(wr,flow,'transporter');
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

		cfg.flows.forEach(flow=>{
			if(!flow.fork) {
				var trs = flow.transporters;
				flow.tstream = walk(trs,flow);
			}
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

	startFlowStream() {
		let
			modules = this.modules,
			inputStream = this.inputStream,
			cfg = this.config,
			strconf = cfg.config.buffer;

		// Active flows
		let flows = cfg.flows.filter(f=>!f.disabled);

		// For each flow, create a queue stream and pipe to processors stream,
		// then, pipe processors stream to transporters stream
		flows.forEach((f,i)=>{
			f.id = f.id || `Flow_${i}`;
			let wstr = new BypassStream(`${f.id}_Entry_Point`);
			f.stream = wstr;
			f.stream.pipe(f.pstream.start);
			f.pstream.end.pipe(f.tstream);
			this.attachEvents(wstr,f,'input');
		});

		// Collect input entries, filter "from" and "when" attributes, and
		// push them to the flow stream
		let flowStream = new FlowStream(flows,strconf.maxPending);
		flowStream.on(Events.transfer,(entry,evt)=>{
			this.emit('all','transfer','input',evt.flow,evt.from,entry,evt.from,evt.to);
			this.emit('all','transfer','flow',evt.flow,evt.from,entry,modules.inputs[entry.input],evt.to);
			this.emit('transfer','input',evt.flow,evt.from,entry,evt.from,evt.to);
			this.emit('transfer','flow',evt.flow,evt.from,entry,modules.inputs[entry.input],evt.to);
		});
		// Instrument the stream
		inputStream.pipe(flowStream);
	}

	startInputs() {
		let
			queueStream = this.queueStream,
			bypassStream = this.bypassStream,
			modules = this.modules,
			cfg = this.config;

		Object.keys(cfg.modules.inputs).forEach(k=>{
			let m = cfg.modules.inputs[k];
			let input = new InputWrapper(m);
			input.on(Events.data,this.handleEvent('data','input',null,input));
			input.on(Events.error,this.handleEvent('error','input',null,input));

			modules.inputs[k] = input;
			input.start(m.mode==MODE.pull? bypassStream:queueStream,(err)=>{
				if(err)
					logger.error(err);
			});
		});
	}

	push(entry,callback) {
		this.inputStream.write(entry,null,callback);
	}
}

NSyslog.Core = {Config, Input, Transporter, Processor, Factory, InputWrapper};
module.exports = NSyslog;
