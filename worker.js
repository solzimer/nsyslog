const CMD = {
	parse : "parse",
	process : "process"
}

var isModule = false;
try {
	isModule = module.parent;
}catch(err) {
	//console.log(err);
};

if(!isModule) {
	const
		extend = require("extend"),
		parser = require("nsyslog-parser"),
		configure = require(__dirname+"/lib/config.js");

	var cfg = null;

	function initialize(callback) {
		configure("./config/cfg001.json",(err,res)=>{
			cfg = res;
			start(cfg);
			callback(err,res);
		});
	}

	function start(cfg) {
		self.onmessage = function(event) {
			if(event.command==CMD.parse) parseEntry(event);
			else if(event.command=CMD.process) processEntry(event);
			else error(event);
		}
	}

	function parseEntry(event) {
		var entry = event.data.entry;
		var id = event.data.id;
		entry = extend(entry,parser(entry.originalMessage));
		postMessage({id:id,entry:entry});
	}

	function processEntry(event) {
		var entry = event.data.entry;
		var id = event.data.id;
		entry = extend(entry,{processed:true});
		postMessage({id:id,entry:entry});
	}

	initialize(()=>{});
}
else {
	const
		Pool = require("./lib/worker-pool"),
		Semaphore = require('semaphore');

	var workers = [];
	var rr = 0;
	var pending = {};

	function voidfn(){}

	function parseEntry(entry,callback) {
		callback = callback || voidfn;

		var id = rr++;
		var w = workers[id%Pool.size];
		pending[id] = {cb:callback,w:w};
		w.worker.postMessage({id:id,command:CMD.parse,entry:entry});
	}

	function processEntry(entry,callback) {
		callback = callback || voidfn;

		var id = rr++;
		var w = workers[id%Pool.size];
		pending[id] = {cb:callback,w:w};
		w.worker.postMessage({id:id,command:CMD.process,entry:entry});
	}

	function resolveEntry(event) {
		var id = event.data.id;
		var entry = event.data.entry;

		var wcb = pending[id];
		delete pending[id];
		wcb.cb(entry);
	}

	for(let i=0;i<Pool.size;i++) {
		Pool.Worker(__filename,w=>{
			w.onmessage = resolveEntry;
			workers.push({
				id : "worker_"+Math.random(),
				worker : w
			});
		});
	}

	module.exports = {
		parse : parseEntry,
		process : processEntry
	}
}
