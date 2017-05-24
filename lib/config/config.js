const
	Q = require("q"),
	fs = require("fs"),
	path = require("path"),
	extend = require("extend"),
	Transporters = require("./transporters.js"),
	Processors = require("./processors.js"),
	expression = require("../expression.js");

const SERVERS = {
	null : require("../server/null.js"),
	udp : require("../server/udp.js"),
	tcp : require("../server/tcp.js")
};

const flatten = arr => arr.reduce(
  (a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []
);

function read(file,callback) {
	var json = {include:[file]};

	imports("",json).then(json=>{
		raw = JSON.parse(JSON.stringify(json));
		processServers(json);
		processFilters(json);
		processFlows(json);
		callback(null,json,raw);
	},err=>{
		callback(err,json);
	});
}

function imports(file,json) {
	var q = Q.defer();
	var basepath = path.dirname(file);

	all = Q.all((json.include || []).map(f=>{
		var q = Q.defer();
		var ifile = basepath + "/" + f;
		fs.readFile(ifile,"utf-8",(err,data)=>{
			if(err) q.reject(err);
			else {
				var njson = JSON.parse(data);
				registerComponents(basepath,njson,(err,res)=>{
					if(err) q.reject(err);
					else {
						imports(ifile,njson).then(q.resolve,q.reject);
					}
				});
			}
		});
		return q.promise;
	})).then(res=>{
		res.forEach(njson=>extend(true,json,njson));
		q.resolve(json);
	},err=>{
		q.reject(err);
	});

	return q.promise;
}

function asArray(v) {
	if(typeof(v)=="string") return [v];
	else return v;
}

function registerComponents(basepath,json,callback) {
	var all = json.register || [];

	return Q.all(all.map(cmp=>{
		var q = Q.defer();
		if(cmp.type=="processor") {
			Processors.register(basepath,cmp,(err,cmp)=>{
				if(err) q.reject(err);
				else q.resolve(cmp);
			});
		}
		return q.promise;
	})).then(
		res=>{callback(null,res)},
		err=>{callback(err,null)}
	);
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

function processFlows(json) {
	const
		MODE = "parallel",
		voidfn = function() {return false;},
		voidtr = ()=>Transporters.instance("NULL");
		voidpr = ()=>Processors.instance("NULL");
		nof = function(f){console.warn(`Filter '${f}' doesn't exist`); return voidfn;},
		nofg = function(f){console.warn(`Filter Group '${f}' doesn't exist`); return voidfn;},
		nop = function(f){console.warn(`Processor '${f}' doesn't exist`); return voidpr;},
		nopg = function(f){console.warn(`Processor Group '${f}' doesn't exist`); return voidpr;},
		notr = function(tr){console.warn(`Transporter '${tr}' doesn't exist`); return voidtr();},
		notrg = function(tr){console.warn(`Transporter Group '${tr}' doesn't exist`); return voidtr();};

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
		var fns = asArray(procs).map(p=>{
			if(p.startsWith("$")) {
				var group = json.processorGroups[p.substring(1)];
				return group? processorTree(json,group) : nopg(p);
			}
			else {
				var def = json.processors[p];
				return def? Processors.instance(p,def.type,def.sticky,def.config) : nop(p);
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
				var def = json.transporters[tr];
				return def? Transporters.instance(tr,def.type,def.config) : notr(tr);
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

module.exports = {
	read : read,
	Transporters : Transporters,
	Processors : Processors
}
