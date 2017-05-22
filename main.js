const
	cluster = require('cluster'),
	net = require('net'),
	program = require("commander"),
	extend = require("extend"),
	AsyncStream = require("promise-stream-queue"),
	configure = require("./lib/config.js"),
	stream = require('stream'),
	Transform = stream.Transform,
	PassThrough = stream.PassThrough,
	NullTransporter = require('./lib/transporter/null.js'),
	NullProcessor = require('./lib/processor/null.js'),
	EndTransporter = require('./lib/transporter/end.js'),
	EndProcessor = require('./lib/processor/end.js');

function initialize() {
	configure("./config/cfg001.json",(err,cfg)=>{
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
	var parserStream = new AsyncStream();
	var seq = 0;

	this.start = function() {
		master.configure(cfg);
		startParserStream();
		startProcessorStream();
		startTransportStream();
		startFlowStream();
		startServers();
	}

	function startParserStream() {
		parserStream.forEach((err,item,ex)=>{
			if(err) console.log(err);
			var entry = item.entry;
			entry.flows = item.flows.map(f=>f.id);
			item.flows.
				filter(flow=>flow.when(entry)).
				forEach(flow=>flow.stream.write(entry));
		});
	}

	function startProcessorStream() {
		cfg.flows.forEach(f=>{
			var to = from = new PassThrough({objectMode:true});
			f.processors.map(proc=>{
				return new Transform({
					objectMode : true,
					transform : function(entry,encoding,callback) {
						master.process(entry,{idproc:proc.id},res=>{
							callback(null,res);
						});
					}
				});
			}).forEach(p=>{
				to = to.pipe(p);
			});
			to.pipe(new EndProcessor());
			f.pstream = {start:from,end:to};
		});
	}

	function startTransportStream() {
		function walk(trs) {
			if(trs.write) {
				return trs;
			}
			else if(trs.mode=="serial") {
				var from = stream = new NullTransporter();
				trs.list.forEach(tr=>{
					stream = stream.pipe(walk(tr));
				});
				stream.pipe(new EndTransporter());
				return from;
			}
			else if(trs.mode=="parallel") {
				var stream = new NullTransporter();
				trs.list.forEach(tr=>{
					stream.pipe(walk(tr)).pipe(new EndTransporter());
				});
				return stream;
			}
		}

		cfg.flows.forEach(flow=>{
			var ntr = new NullTransporter();
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

	function collectEntry(entry) {
		entry.seq = seq++;
		parserStream.push(new Promise((resolve,reject)=>{
			var flows = cfg.flows.filter(f=>!f.disabled).filter(f=>f.from(entry));
			if(flows.find(flow=>flow.parse)) {
				master.parse(entry,null,rentry=>resolve({entry:extend(entry,rentry),flows:flows}));
			}
			else {
				resolve({entry:entry,flows:flows});
			}
		}));
	}

	function startServers() {
		for(var i in cfg.servers) {
			var server = cfg.servers[i];
			server.start(collectEntry);
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
