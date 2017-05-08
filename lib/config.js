const
	fs = require("fs"),
	expression = require("./expression.js");

const TRANSPORTERS = {}

function read(path,callback) {
	fs.readFile(path,"utf-8",(err,data)=>{
		var json = {};
		try {
			json = JSON.parse(data);
		}catch(err) {
			callback(err,null);
		}

		processFilters(json);
		processTransporters(json);
		processFlows(json);

		console.log(json);
		callback(null,json);
	});
}

function asArray(v) {
	if(typeof(v)=="string") return [v];
	else return v;
}

function defaultRegisters() {
	TRANSPORTERS["null"] = require("./transporter/null.js");
	TRANSPORTERS["file"] = require("./transporter/file.js");
	TRANSPORTERS["console"] = require("./transporter/console.js");
}

function processFilters(json) {
	for(var i in json.filters) {
		var val = json.filters[i];
		json.filters[i] = expression.fn(val);
	}
}

function processTransporters(json) {
	var jstr = json.transporters || {};
	for(var id in jstr) {
		var trdef = TRANSPORTERS[jstr[id].type] || TRANSPORTERS["null"];
		var tr = new trdef();
		tr.configure(jstr[id].config || {});
		jstr[id] = tr;
	}
}

function processFlows(json) {
	const voidfn = function() {return false;}
	const nof = function(f){console.warn(`Filter '${f}' doesn't exist`); return voidfn;}
	const nofg = function(f){console.warn(`Filter Group '${f}' doesn't exist`); return voidfn;};

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

	json.flows.forEach(flow=>{
		flow.from = filterTree(json,flow.from);
	});
}

defaultRegisters();

if(!module.parent) {
	read(__dirname+"/../config/template.json",(err,json)=>{
		console.log(err);
		console.log(json.flows[0].from({
			host : "mymachine",
			appName : "so",
			server : {protocol: "tcp"},
			client : {address : "192.168.135.49"}
		}));
	});
}
else {
	module.exports = read;
}
