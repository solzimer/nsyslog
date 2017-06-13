const
	cluster = require('cluster'),
	program = require("commander"),
	extend = require("extend"),
	FileQueue = require("fileq"),
	StatsDB = require("./lib/stats.js"),
	Config = require("./lib/config/config.js"),
	AsyncStream = require("promise-stream-queue"),
	QueueStream = require("./lib/stream/queuestream.js"),
	AwaitStream = require("./lib/stream/awaitstream.js"),
	Duplex = require("stream").Duplex,
	Transform = require("stream").Transform,
	Writable = require('stream').Writable;
	Transporters = Config.Transporters,
	Processors = Config.Processors;

function initialize() {
	Config.read("./config/cfg001.json",(err,cfg)=>{
		if(err) {
			console.error(err);
			return;
		}

		if(cluster.isMaster) {
			console.log(cfg);
			var master = new Master(cfg);
			master.start();
		}
		else {
			var slave = new Slave(cfg);
			slave.start();
		}
	});
}

function Master(cfg) {
	const master = require("./cluster/master.js");
	const CMD = master.CMD;

	var qconf = extend(true,{max:1000,bsize:500},cfg.config.queue);
	var strconf = extend(true,{},cfg.config.stream);
	var queue = FileQueue.from('./db/servers',qconf);
	var queueStream = new QueueStream(queue);	// Stream for the fileq file buffer
	var seq = 0;

	this.start = function() {
		try {
			master.configure(cfg);
			master.ready.then(()=>{
				startProcessorStream();
				startTransportStream();
				startFlowStream();
				startParserStream();
				startServers();
			});
		}catch(err) {
			console.error(err);
			process.exit(1);
		}
	}

	function startProcessorStream() {
		cfg.flows.forEach(f=>{
			var to = from = Processors.Init();
			f.processors.map(proc=>{
				var options = {idproc:proc.id,idflow:f.id,sid:proc.sticky?proc.id:null};
				return master.SlaveStream(CMD.process,options);
			}).forEach(p=>{
				to = to.pipe(p);
			});
			to.pipe(Processors.End());
			f.pstream = {start:from,end:to};
		});
	}

	function startTransportStream() {
		function strok(msg,instance,flow){

			console.log("OK",instance.id,flow.id);
		};
		function strerr(msg,instance,flow){
			//console.error("ERR");
		};
		function handle(str){
			//StatsDB.createTimed(`${null}`);
			return str.on("strerr",strerr).on("strok",strok);
		};

		function walk(trs,flow) {
			if(trs.transport) {
				return handle(master.MasterStream(CMD.transport,trs,flow));
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
		cfg.flows.forEach(f=>{
			var fileq = FileQueue.from(`./db/flows/${f.id}`,{truncate:true});
			var wstr = new QueueStream(fileq,{highWaterMark:strconf.buffer});
			f.stream = wstr;
			f.stream.pipe(f.pstream.start);
			f.pstream.end.pipe(f.tstream);
		});
	}

	function startParserStream() {
		// Active flows
		var flows = cfg.flows.filter(f=>!f.disabled);

		// Transform that sends lines to parser workers ands pushes a Promise
		var parserTransform = new Transform({
			objectMode:true, highWaterMark:strconf.buffer,
			transform(entry, encoding, callback) {
				entry.seq = seq++;
				var aflows = flows.filter(f=>f.from(entry));
				var parse = aflows.find(flow=>flow.parse);
				var pr = new Promise((resolve,reject)=>{
					if(parse) {
						master.parse(entry,null,(err,res)=>{
							resolve({entry:extend(entry,res),flows:aflows});
						});
					}
					else {
						resolve({entry:entry,flows:aflows});
					}
				});

				callback(null,pr);
			}
		});

		// Transform that limits async entry reads (unresolved promises) to
		// highWaterMark value
		var awaitStream = new AwaitStream({
			highWaterMark : strconf.buffer
		});

		// Duplex stream that serializes promises
		var asyncStream = new AsyncStream().toStream({
			highWaterMark : strconf.buffer
		});

		// End of the stream. Collect the parsed entries and push them to the
		// flow stream
		var endStream = new Transform({
			objectMode:true, highWaterMark:strconf.buffer,
			transform(item, encoding, callback) {
				var entry = item.entry;
				entry.flows = item.flows.map(f=>f.id);
				item.flows.
					filter(flow=>flow.when(entry)).
					forEach(flow=>flow.stream.write(entry));
				callback();
			}
		});

		// Instrument the parser flow
		queueStream.								// Reads from fileQ
			pipe(parserTransform).		// Generates a promise to parser worker
			pipe(awaitStream).				// Limits to X pending parses
			pipe(asyncStream).				// Serialize resolved parses
			pipe(endStream);					// Send parsed lines to process flow
	}

	function startServers() {
		for(var i in cfg.servers) {
			var server = cfg.servers[i];
			server.start(entry=>queueStream.write(entry));
		}
	}
}

function Slave(cfg) {
	const slave = require('./cluster/slave.js');

	this.start = function() {
		slave.configure(cfg);
		slave.start();
	}
}


initialize();
