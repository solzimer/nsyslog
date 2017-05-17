const
	Q = require("q"),
	net = require('net'),
	program = require("commander"),
	extend = require("extend"),
	AsyncStream = require("promise-stream-queue"),
	worker = require("./worker.js"),
	configure = require("./lib/config.js"),
	UDPServer = require("./lib/server/udp.js"),
	NullTransporter = require('./lib/transporter/null.js'),
	moment = require("moment");

var parserStream = new AsyncStream();
var cfg = null;
var seq = 0;

function initialize() {
	configure("./config/cfg001.json",(err,res)=>{
		cfg = res;
		console.log(JSON.stringify(cfg,0,2));
		startParserStream();
		startTransportStreams();
		startServers();
	});
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
			worker.parse(entry,rentry=>resolve({entry:extend(entry,rentry),flows:flows}));
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

initialize();
