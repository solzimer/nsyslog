const
	fs = require("fs"),
	extend = require("extend"),
	Transform = require('stream').Transform,
	expression = require("./expression.js");

const TRANSPORTERS = {
	null : require("./transporter/null.js"),
	file : require("./transporter/file.js"),
	console : require("./transporter/console.js")
};

const PROCESSORS = {
	null : require("./processor/processor.js"),
	properties : require("./processor/properties.js")
};

const SERVERS = {
	null : require("./server/null.js"),
	udp : require("./server/udp.js"),
	tcp : require("./server/tcp.js")
};

const flatten = arr => arr.reduce(
  (a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []
);

function read(path,callback) {
	fs.readFile(path,"utf-8",(err,data)=>{
		var json = {}, raw = {};
		try {
			json = JSON.parse(data);
			raw = JSON.parse(data);
		}catch(err) {
			callback(err,null);
		}

		processServers(json);
		processFilters(json);
		processTransporters(json);
		processFlows(json);

		callback(null,json,raw);
	});
}

function asArray(v) {
	if(typeof(v)=="string") return [v];
	else return v;
}

function wrapStream(cls,method) {
	if(cls instanceof Transform) return cls;
	else return new Transform({
		transform(chunk, encoding, callback) {
			cls[method](chunk,callback);
		}
	});
}

function processServers(json) {
	for(var i in json.servers) {
		var def = json.servers[i];
		var cls = SERVERS[def.type] || SERVERS.null;
		var instance = new cls();
		instance.configure(def.config);
		json.servers[i] = instance;
	}
}

function processFilters(json) {
	json.filters["*"] = "true";

	for(var i in json.filters) {
		var val = json.filters[i];
		json.filters[i] = expression.fn(val);
		json.filters[i].id = val;
	}
}

function processTransporters(json) {
	var jstr = json.transporters || {};
	for(var id in jstr) {
		var trdef = TRANSPORTERS[jstr[id].type] || TRANSPORTERS.null;
		var tr = new trdef(extend({objectMode:true},jstr[id].config));
		jstr[id] = wrapStream(tr,"send");
	}
}

function processProcessors(json) {
	var jspr = json.transporters || {};
	for(var id in jspr) {
		var prdef = PROCESSORS[jspr[id].type] || PROCESSORS.null;
		var pr = new prdef(extend({objectMode:true},jspr[id].config));
		jspr[id] = wrapStream(pr,"process");
	}
}

function processFlows(json) {
	const
		MODE = "parallel",
		voidfn = function() {return false;},
		voidtr = new TRANSPORTERS.null(),
		voidpr = new PROCESSORS.null(),
		nof = function(f){console.warn(`Filter '${f}' doesn't exist`); return voidfn;},
		nofg = function(f){console.warn(`Filter Group '${f}' doesn't exist`); return voidfn;},
		nop = function(f){console.warn(`Processor '${f}' doesn't exist`); return voidpr;},
		nopg = function(f){console.warn(`Processor Group '${f}' doesn't exist`); return voidpr;},
		notr = function(tr){console.warn(`Transporter '${tr}' doesn't exist`); return voidtr;},
		notrg = function(tr){console.warn(`Transporter Group '${tr}' doesn't exist`); return voidtr;};

	function filterTree(json,filters) {
		var fns = asArray(filters).map(f=>{
			if(f.startsWith("$")) {
				var group = json.filterGroups[f.substring(1)];
				return group? filterTree(json,group) : nofg(f);
			}
			else {
				return json.filters[f]||nof(f);
			}
		});
		return function(entry) {
			return fns.some(fn=>fn(entry));
		}
	}

	function processorTree(json,procs) {
		var fns = asArray(procs).map(f=>{
			if(f.startsWith("$")) {
				var group = json.processorGroups[f.substring(1)];
				return group? processorTree(json,group) : nopg(f);
			}
			else {
				return json.processors[f]||nop(f);
			}
		});
		return flatten(fns);
	}

	function transTree(json,transporters,mode) {
		var trs = asArray(transporters).map(tr=>{
			if(tr.startsWith("$")) {
				var group = json.transporterGroups[tr.substring(1)];
				return group? transTree(json,group.transporters,group.mode||MODE) : notrg(tr);
			}
			else {
				return json.transporters[tr] || nof(f);
			}
		});
		return {list:trs,mode:mode||MODE};
	}

	json.flows.forEach((flow,i)=>{
		flow.parse = flow.parse===undefined? true : flow.parse;

		// From Filters
		flow.from = flow.from || "*";
		flow.from = filterTree(json,flow.from);

		// When Filters
		flow.when = flow.when || "*";
		flow.when = filterTree(json,flow.when);

		// Transporters
		flow.transporters = flow.transporters || [];
		flow.transporters = transTree(json,flow.transporters,flow.mode||MODE);

		// Processors
		flow.processors = flow.processors || [];
		flow.processors = processorTree(json,flow.processors);

		flow.id = flow.id || `flow_${i}`;
	});
}

module.exports = read;
