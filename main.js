const
	Q = require("q"),
	net = require('net'),
	program = require("commander"),
	extend = require("extend"),
	AsyncStream = require("promise-stream-queue"),
	worker = require("./worker.js"),
	configure = require("./lib/config.js"),
	UDPServer = require("./lib/server/udp.js"),
	moment = require("moment");

var parserStream = new AsyncStream();
var cfg = null;
var seq = 0;

function initialize() {
	configure("./config/cfg001.json",(err,res)=>{
		cfg = res;
		console.log(JSON.stringify(cfg,0,2));
		startParserStream();
		startServers();
	});
}

function startParserStream() {
	parserStream.forEach((err,item,ex)=>{
		var entry = item.entry;
		item.flows.
			filter(flow=>flow.when(entry)).
			forEach(flow=>transport(entry,flow.transporters));
	});
}

function transport(entry,transporters) {
	function newPromise(tr) {
		if(tr.write)
			return new Promise((res,rej)=>{tr.write(entry,()=>res(entry))});
		else
			return transport(entry,tr);
	}

	return new Promise((resolve,reject)=>{
		if(transporters.mode=="serial") {
			var pr = Promise.resolve(entry);
			transporters.list.forEach(tr=>{
				var npr = newPromise(tr);
				pr.then(npr);
				pr = npr;
			});
			pr.then(resolve);
		}
		else if(transporters.mode=="parallel") {
			var pr = transporters.list.map(tr=>newPromise(tr));
			Promise.all(pr).then(resolve);
		}
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
