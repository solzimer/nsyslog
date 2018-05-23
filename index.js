const
	program = require("commander"),
	extend = require("extend"),
	FileQueue = require("fileq"),
	Config = require("./lib/config"),
	AsyncStream = require("promise-stream-queue"),
	QueueStream = require("./lib/stream/queuestream.js"),
	AwaitStream = require("./lib/stream/awaitstream.js"),
	Duplex = require("stream").Duplex,
	Transform = require("stream").Transform,
	Writable = require('stream').Writable;
	Transporters = Config.Transporters,
	Processors = Config.Processors,
	Factory = require("./lib/factory"),
	StatsDB = require("./lib/stats");

async function initialize() {
	try {
		let cfg = await Config.read("./config/cfg001.json");

		console.log(cfg);
		var master = new NSyslog(cfg);
		master.start();

	}catch(err) {
		console.error(err);
		return;
	}
}

function NSyslog(cfg) {
	const tstats = [
		{path:"/sec/30", time:1000*30, options:{step:100,ops:["count"]}},
		{path:"/sec/60", time:1000*60, options:{step:1000,ops:["count"]}},
		{path:"/min/5", time:1000*60*6, options:{step:5000,ops:["count"]}},
		{path:"/min/15", time:1000*60*15, options:{step:10000,ops:["count"]}},
		{path:"/min/30", time:1000*60*30, options:{step:10000,ops:["count"]}},
		{path:"/min/60", time:1000*60*60, options:{step:10000,ops:["count"]}},
	]

	var strconf = extend(true,{buffer:100},cfg.config.stream);
	var queue = FileQueue.from('servers',{path:"db"});
	var queueStream = new QueueStream(queue);	// Stream for the fileq file buffer
	var seq = 0;

	this.start = async function() {
		try {
			startProcessorStream();
			startTransportStream();
			startFlowStream();
			startInputs();
		}catch(err) {
			console.error(err);
			process.exit(1);
		}
	}

	function startProcessorStream() {
		cfg.flows.forEach(flow=>{
			var to = from = Processors.Init();
			flow.processors.
				map(proc=>Factory.transform(proc,flow)).
				forEach(p=>to = to.pipe(p));
			to.pipe(Processors.End());
			flow.pstream = {start:from,end:to};
		});
	}

	function startTransportStream() {
		function strok(msg,instance,flow){
			tstats.forEach(s=>{
				var path = `${s.path}/${flow.id}/${instance.id}`;
				StatsDB.push(path,1);
			});
		};
		function strerr(msg,instance,flow){
			console.error("ERR");
		};
		function handle(str){
			if(str.flow && str.instance) {
				tstats.forEach(s=>{
					var path = `${s.path}/${str.flow.id}/${str.instance.id}`;
					StatsDB.createTimed(path,s.time,s.options);
				});
				return str.on("strerr",strerr).on("strok",strok);
			}
			else return str;
		};

		function walk(trs,flow) {
			if(trs.transport) {
				return handle(Factory.writer(trs,flow));
			}
			else if(trs.mode=="serial") {
				var from = stream = Transporters.Null();
				trs.list.forEach(tr=>{
					stream = stream.pipe(walk(tr,flow));
				});
				stream.pipe(handle(Transporters.End()));
				return from;
			}
			else if(trs.mode=="parallel") {
				var stream = Transporters.Null();
				trs.list.forEach(tr=>{
					stream.pipe(walk(tr,flow)).pipe(handle(Transporters.End()));
				});
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

	function startFlowStream() {
		// Active flows
		var flows = cfg.flows.filter(f=>!f.disabled);

		// For each flow, create a queue stream and pipe to processors stream,
		// then, pipe processors stream to transporters stream
		flows.forEach(f=>{
			var fileq = FileQueue.from(f.id,{path:'./db/flows/${f.id}',truncate:true});
			var wstr = new QueueStream(fileq,{highWaterMark:strconf.buffer});
			f.stream = wstr;
			f.stream.pipe(f.pstream.start);
			f.pstream.end.pipe(f.tstream);
		});

		// Collect input entries, filter "from" and "when" attributes, and
		// push them to the flow stream
		var flowStream = new Transform({
			objectMode:true, highWaterMark:strconf.buffer,
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
		queueStream.pipe(flowStream);
	}

	function startInputs() {
		for(var i in cfg.inputs) {
			var input = cfg.inputs[i];
			input.start((err,entry)=>queueStream.write(entry));
		}
	}
}

initialize();
