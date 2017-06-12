const
	cluster = require('cluster'),
	program = require("commander"),
	extend = require("extend"),
	FileQueue = require("fileq"),
	Config = require("./lib/config/config.js"),
	QueueStream = require("./lib/queuestream.js"),
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
	var queue = FileQueue.from('./db/servers',qconf);
	var queueStream = new QueueStream(queue);
	var seq = 0;

	this.start = function() {
		try {
			master.configure(cfg);
			startProcessorStream();
			startTransportStream();
			startFlowStream();
			startParserStream();
			startServers();
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
		function strok(msg,instance){
			//console.log("OK");
		};
		function strerr(msg,instance){
			//console.error("ERR");
		};
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
			var trs = flow.transporters;
			flow.tstream = walk(trs);
		});
	}

	function startFlowStream() {
		cfg.flows.forEach(f=>{
			var fileq = FileQueue.from(`./db/flows/${f.id}`,{truncate:true});
			var wstr = new Duplex({
				highWaterMark : cfg.config.stream.buffer,
				objectMode : true,
				write(entry, encoding, callback) {
					console.log("Write => "+entry.originalMessage);
					fileq.push(entry,callback);
  			},
				read(size) {
					fileq.peek((err,entry)=>{
						console.log("Read =>"+entry.originalMessage);
						this.push(entry);
					});
				}
			});
			f.stream = wstr;
			f.stream.pipe(f.pstream.start);
			f.pstream.end.pipe(f.tstream);
		});
	}

	function startParserStream() {
		queueStream.pipe(new Transform({
			objectMode : true,
			highWaterMark : cfg.config.stream.buffer,
			transform(entry, encoding, callback) {
				entry.seq = seq++;

				var flows = cfg.flows.filter(f=>!f.disabled).filter(f=>f.from(entry));
				if(flows.find(flow=>flow.parse)) {
					master.parse(entry,null,(err,res)=>{
						callback(null,{entry:extend(entry,res),flows:flows})
					});
				}
				else {
					callback(null,{entry:entry,flows:flows});
				}
			}
		})).pipe(new Writable({
			objectMode : true,
			highWaterMark : cfg.config.stream.buffer,
			write(item, encoding, callback) {
				var entry = item.entry;
				entry.flows = item.flows.map(f=>f.id);
				item.flows.
					filter(flow=>flow.when(entry)).
					forEach(flow=>flow.stream.write(entry));

				callback();
			}
		}));
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
