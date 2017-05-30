const
	cluster = require('cluster'),
	program = require("commander"),
	extend = require("extend"),
	FileQueue = require("fileq"),
	AsyncStream = require("promise-stream-queue"),
	Config = require("./lib/config/config.js"),
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

	var queue = FileQueue.from('./db/servers',{max:1000,bsize:500});
	var parserStream = new AsyncStream();
	var seq = 0;

	this.start = function() {
		try {
			master.configure(cfg);
			startParserStream();
			startProcessorStream();
			startTransportStream();
			startFlowStream();
			startServers();
			entryLoop();
		}catch(err) {
			console.error(err);
			process.exit(1);
		}
	}

	function startParserStream() {
		parserStream.forEach((err,item,ex)=>{
			if(err) {
				console.log(err);
				return;
			}
			var entry = item.entry;
			entry.flows = item.flows.map(f=>f.id);
			item.flows.
				filter(flow=>flow.when(entry)).
				forEach(flow=>flow.stream.write(entry));
		});
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
		function strok(msg){console.log("OK")};
		function strerr(msg){console.error("ERR")};
		function handle(str){
			return str.on("strerr",strerr).on("strok",strok);
		};

		function walk(trs) {
			if(trs.transport) {
				return handle(master.MasterStream(CMD.transport,trs));
			}
			else if(trs.mode=="serial") {
				var from = stream = Transporters.Null();
				trs.list.forEach(tr=>{
					stream = stream.pipe(walk(tr));
				});
				stream.pipe(handle(Transporters.End()));
				return from;
			}
			else if(trs.mode=="parallel") {
				var stream = Transporters.Null();
				trs.list.forEach(tr=>{
					stream.pipe(walk(tr)).pipe(handle(Transporters.End()));
				});
				return stream;
			}
			else {
				throw new Error(`Invalid transporter ${trs.id}`);
			}
		}

		cfg.flows.forEach(flow=>{
			var ntr = Transporters.Null();
			var trs = flow.transporters;
			flow.tstream = walk(trs);
		});
	}

	function startFlowStream() {
		cfg.flows.forEach(f=>{
			f.stream = f.pstream.start;
			f.pstream.end.pipe(f.tstream);
		})
	}

	function entryLoop() {
		queue.peek((err,entry)=>{
			entry.seq = seq++;
			parserStream.push(new Promise((resolve,reject)=>{
				var flows = cfg.flows.filter(f=>!f.disabled).filter(f=>f.from(entry));
				if(flows.find(flow=>flow.parse)) {
					master.parse(entry,null,(err,res)=>{
						resolve({entry:extend(entry,res),flows:flows})
					});
				}
				else {
					resolve({entry:entry,flows:flows});
				}
			}));
			entryLoop();
		});
	}

	function startServers() {
		for(var i in cfg.servers) {
			var server = cfg.servers[i];
			server.start(entry=>queue.push(entry));
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
