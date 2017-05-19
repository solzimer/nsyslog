const
	cluster = require('cluster'),
	net = require('net'),
	program = require("commander"),
	extend = require("extend"),
	AsyncStream = require("promise-stream-queue"),
	configure = require("./lib/config.js"),
	NullTransporter = require('./lib/transporter/null.js');


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
		startTransportStreams();
		startServers();
	}

	function startParserStream() {
		parserStream.forEach((err,item,ex)=>{
			var entry = item.entry;
			item.flows.
				filter(flow=>flow.when(entry)).
				forEach(flow=>flow.stream.write(entry));
		});
	}

	function startTransportStreams() {
		function walk(trs) {
			if(trs.write) {
				return trs;
			}
			else if(trs.mode=="serial") {
				var from = stream = new NullTransporter();
				trs.list.forEach(tr=>{
					stream = stream.pipe(walk(tr));
				});
				return from;
			}
			else if(trs.mode=="parallel") {
				var stream = new NullTransporter();
				trs.list.forEach(tr=>{
					stream.pipe(walk(tr));
				});
				return stream;
			}
		}

		cfg.flows.forEach(flow=>{
			var ntr = new NullTransporter();
			var trs = flow.transporters;
			flow.stream = walk(trs);
		});
	}

	function collectEntry(entry) {
		entry.seq = seq++;
		parserStream.push(new Promise((resolve,reject)=>{
			var flows = cfg.flows.filter(flow=>flow.from(entry));
			if(flows.find(flow=>flow.parse)) {
				master.parse(entry,rentry=>resolve({entry:extend(entry,rentry),flows:flows}));
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
