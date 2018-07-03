const
	logger = require("./logger"),
	extend = require("extend"),
	EventEmiter = require("events"),
	FileQueue = require("fileq"),
	Reemiter = require("./reemiter"),
	Config = require("./config"),
	BypassStream = require("./stream/bypasstream"),
	QueueStream = require("./stream/queuestream"),
	InputWrapper = require("./input/wrapper"),
	Transform = require("stream").Transform,
	Transporters = Config.Transporters,
	Processors = Config.Processors,
	Factory = require("./factory");

function prfn(obj,cmd) {
	return new Promise((ok,rej)=>obj[cmd](err=>err?rej(err):ok()));
}

class NSyslog extends EventEmiter {
	constructor(cfg) {
		super();

		this.config = cfg;
		this.datadir = this.config.config.datadir || "./db";
		this.modules = extend({inputs : {},	processors : {},	transporters : {}},cfg.modules);

		// Stream for the fileq file buffer
		this.queueStream = new QueueStream(FileQueue.from('inputs',{path:`${this.datadir}`,truncate:true}));
		this.queueStream.on("error",logger.error.bind(logger));
		this.bypassStream = new BypassStream();
		this.inputStream = new BypassStream();
		this.queueStream.pipe(this.inputStream);
		this.bypassStream.pipe(this.inputStream);
		Reemiter.setStream(this.inputStream);
	}

	static readConfig(path) {
		return Config.read(path);
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
		await Promise.all(
			Object.keys(inputs).map(key=>inputs[key]).map(m=>prfn(m,'stop'))
		);
		logger.info('Stopping processors...');
		await Promise.all(
			Object.keys(procs).map(key=>procs[key]).map(m=>prfn(m,'stop'))
		);
		logger.info('Stopping transporters...');
		await Promise.all(
			Object.keys(trans).map(key=>trans[key]).map(m=>prfn(m,'stop'))
		);
		logger.info('All modules stopped');
	}

	handleEvent(event,stage,flow,module) {
		return function(entry) {
			if(!entry) return;

			if(entry.seq) {
				entry.flow = entry.flow || {};
				entry.flow[flow.id] = entry.flow[flow.id] || [];
				entry.flow[flow.id].push(module.instance.id);
			}
			
			this.emit('all',event,stage,flow,module,entry);
			this.emit(event,stage,flow,module,entry);
		}.bind(this);
	}

	startProcessorStream() {
		let self = this;
		let	cfg = this.config;
		let procs = this.modules.processors;

		cfg.flows.forEach(flow=>{
			var to = Processors.Init(), from = to;
			flow.processors.
				map(proc=>Factory.transform(proc,flow)).
				forEach(p=>{
					p.on('stream_data',this.handleEvent('data','processor',flow,p));
					p.on('stream_error',this.handleEvent('error','processor',flow,p));
					to = to.pipe(p);
				});
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
				wr.on('stream_data',self.handleEvent('data','transporter',flow,wr));
				wr.on('stream_error',self.handleEvent('error','transporter',flow,wr));
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
			var trs = flow.transporters;
			flow.tstream = walk(trs,flow);
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
			inputStream = this.inputStream,
			cfg = this.config,
			strconf = cfg.config.buffer,
			seq = 0;

		// Active flows
		var flows = cfg.flows.filter(f=>!f.disabled);

		// For each flow, create a queue stream and pipe to processors stream,
		// then, pipe processors stream to transporters stream
		flows.forEach((f,i)=>{
			//var fileq = FileQueue.from(f.id,{path:`${this.datadir}/flows`,truncate:true});
			var wstr = new BypassStream();// new QueueStream(fileq,{highWaterMark:strconf.maxPending});
			f.id = f.id || `Flow_${i}`;
			f.stream = wstr;
			f.stream.pipe(f.pstream.start);
			f.pstream.end.pipe(f.tstream);
		});

		// Collect input entries, filter "from" and "when" attributes, and
		// push them to the flow stream
		var flowStream = new Transform({
			objectMode:true, highWaterMark:strconf.maxPending,
			transform(entry, encoding, callback) {
				entry.seq = seq++;
				let aflows = flows.filter(f=>f.from(entry));
				entry.flows = aflows.map(f=>f.id);
				aflows.
					filter(flow=>flow.when(entry)).
					forEach(flow=>flow.stream.write(entry));
				callback();
			}
		});

		// Instrument the stream
		inputStream.pipe(flowStream);
	}

	startInputs() {
		let
			queueStream = this.queueStream,
			bypassStream = this.bypassStream,
			modules = this.modules,
			cfg = this.config,
			icfg = cfg.config.info;

		Object.keys(cfg.modules.inputs).forEach(k=>{
			let m = cfg.modules.inputs[k];
			let input = new InputWrapper(m);
			input.on('stream_data',this.handleEvent('data','input',null,input));
			input.on('stream_error',this.handleEvent('error','input',null,input));

			modules.inputs[k] = input;
			input.start(input.buffer? queueStream:bypassStream,(err)=>{
				if(err)
					logger.error(err);
			});
		});
	}
}

module.exports = NSyslog;
