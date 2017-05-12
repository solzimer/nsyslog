const
	fs = require("fs"),
	expression = require("./expression.js");

const TRANSPORTERS = {
	null : require("./transporter/null.js"),
	file : require("./transporter/file.js"),
	console : require("./transporter/console.js")
};

const SERVERS = {
	null : require("./server/null.js"),
	udp : require("./server/udp.js"),
	tcp : require("./server/tcp.js")
};

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
		var trdef = TRANSPORTERS[jstr[id].type] || TRANSPORTERS["null"];
		var tr = new trdef();
		tr.configure(jstr[id].config || {}, json);
		jstr[id] = tr;
	}
}

function processFlows(json) {
	const
		MODE = "parallel",
		voidfn = function() {return false;},
		voidtr = new TRANSPORTERS.null(),
		nof = function(f){console.warn(`Filter '${f}' doesn't exist`); return voidfn;},
		nofg = function(f){console.warn(`Filter Group '${f}' doesn't exist`); return voidfn;},
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

	function transTree(json,transporters,mode) {
		var trs = asArray(transporters).map(tr=>{
			if(tr.startsWith("$")) {
				var group = json.transporterGroups[tr.substring(1)];
				return group? transTree(json,group.transporters,group.mode||MODE) : notrg(tr);
			}
			else {
				return json.transporters[tr] || nof(f);;
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
		flow.transporters = transTree(json,flow.transporters,flow.mode||MODE);

		flow.id = flow.id || `flow_${i}`;
	});
}

module.exports = read;
