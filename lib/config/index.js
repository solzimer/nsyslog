const
	logger = require('../logger'),
	fs = require("fs-extra"),
	path = require("path"),
	extend = require("extend"),
	Inputs = require("./inputs"),
	Transporters = require("./transporters"),
	Processors = require("./processors"),
	TLS = require('../tls'),
	expression = require("jsexpr");

const MAX_PENDING = 100;
const DEF_CONF = {
	input : {maxPending:MAX_PENDING},
	buffer : {maxPending:MAX_PENDING},
	processor : {maxPending:MAX_PENDING},
	transporter : {maxPending:MAX_PENDING}
}

// Flatten an array of nested arrays of nested arrays...
const flatten = arr => arr.reduce(
  (a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []
);

// Simple function to unify flow attributes as arrays
function asArray(v) {
	if(typeof(v)=="string") return [v];
	else return v;
}

/**
 * Reads the main configuration file and retrieve
 * the instances of servers, filters, processors
 * and transformers
 */
async function read(file,callback,validateOnly) {
	// Since a config file can have nested includes
	// that must be merged into the main file, the
	// process is recursive. We create a first
	// virtual configuration, wich includes the main
	// file
	var json = {
		include:[file],
		transporters: {
			"#" : {
				type : "reemit",
				config : {}
			}
		}
	};

	try {
		// Includes and merges all the configuration files
		json = await imports("",json);

		// Gets the raw json before replacing keys with
		// actual instances of components
		let raw = JSON.parse(JSON.stringify(json));

		json.config = extend(true,{},DEF_CONF,json.config);
		json.modules = {inputs:{},processors:{},transporters:{}};
		json.$filepath = path.resolve(file);
		json.$path = path.dirname(json.$filepath);
		json.$datadir = path.resolve(json.config.datadir||process.cwd());

		// Set defaults for TLS
		TLS.defaults({},json.$path);
		sanitizeModules(json);			// Extend modules config
		sanitizeFlows(json);				// Sanitize flow configs

		if(validateOnly) return json;
		await processInputs(json); 	// Get Inputs
		processFilters(json);				// Get Filters
		await processFlows(json);		// Get Flows

		if(callback) callback(null,json,raw);
		else return json;
	}catch(err) {
		if(callback) callback(err);
		else throw err;
	}
}

/**
 * Imports recursively nested configuration files, and registers
 * custom components. The final result is the merged configuration
 */
async function imports(file,json) {
	var basepath = path.dirname(file);

	let all = (json.include || []).map(async f=>{
		let ifile = `${basepath}/${f}`;
		let data = await fs.readFile(ifile,"utf-8");
		let njson = JSON.parse(data);

		// Register components
		await registerComponents(basepath,njson);
		return await imports(ifile,njson);
	});

	// Merge parent file with nested includes
	let res = await Promise.all(all);
	res.forEach(njson=>{
		let flows = njson.flows;
		delete njson.flows;
		extend(true,json,njson);
		json.flows = [].concat(json.flows||[]).concat(flows||[]);
	});
	return json;
}

/**
 * Register custom components
 */
async function registerComponents(basepath,json) {
	var comps = json.register || [];

	var voidfn = (basepath,cmp)=>{
		throw new Error(`Invalid component type ${cmp.id} => ${cmp.type}`);
	};

	// For every declared component
	let all = comps.map(async cmp=>{
		let register = voidfn;
		if(cmp.type=="processor") register = Processors.register;
		else if(cmp.type=="transporter") register = Transporters.register;
		else if(cmp.type=="input") register = Inputs.register;

		return await register(basepath,cmp);
	});

	let components = await Promise.all(all);
	return components;
}

function sanitizeModules(json) {
	let cfg = json.config;
	let opath = {$path:json.$path,$filepath:json.$filepath,$datadir:json.$datadir};
	let owhen = {filter:false,bypass:false};
	let modules = [json.inputs,json.processors,json.transporters];

	modules.forEach(modules=>{
		for(let i in modules) {
			let def = modules[i];

			def.config = extend({},def.config,opath);
			def.maxPending = def.maxPending || cfg.input.maxPending;
			def.buffer = def.buffer || false;
			def.when = extend({},owhen,def.when);
		}
	});
}

function sanitizeFlows(json) {
	let i=0;

	json.flows.forEach(flow=>{
		flow.id = `Flow_${i++}`;
	});
}

async function processInputs(json) {
	let all = [];

	for(var i in json.inputs) {
		var def = json.inputs[i];
		all.push(Inputs.instance(i,def.type,def.config));
	}

	let inputs = await Promise.all(all);
	inputs.forEach(input=>{
		input.$def = json.inputs[input.id];
		json.modules.inputs[input.id] = input;
	});
}

function processFilters(json) {
	json.filters = json.filters || {};
	json.filters["*"] = "true";
	json.filterGroups = json.filterGroups || {};

	json.flows.forEach(flow=>{
		if(!json.filters[flow.from] && json.inputs[flow.from])
		 	json.filters[flow.from] = '${input}=="'+flow.from+'"';
	});

	for(var i in json.filters) {
		var val = json.filters[i];
		json.filters[i] = expression.fn(val);
		json.filters[i].id = val;
	}
}

async function processFlows(json) {
	const
		MODE = "parallel",
		voidfn = function() {return false;},
		voidtr = ()=>Transporters.instance("NULL"),
		voidpr = ()=>Processors.instance("NULL"),
		vf = function(val){try{return expression.fn(val)}catch(err){return null}},
		nof = function(f){logger.warn(`Filter '${f}' doesn't exist`); return voidfn;},
		nofg = function(f){logger.warn(`Filter Group '${f}' doesn't exist`); return voidfn;},
		nop = function(f){logger.warn(`Processor '${f}' doesn't exist`); return voidpr;},
		nopg = function(f){logger.warn(`Processor Group '${f}' doesn't exist`); return voidpr;},
		notr = function(tr){logger.warn(`Transporter '${tr}' doesn't exist`); return voidtr();},
		notrg = function(tr){logger.warn(`Transporter Group '${tr}' doesn't exist`); return voidtr();};

	async function filterTree(json,filters) {
		var fns = asArray(filters).map(f=>{
			if(f.startsWith("$")) {
				var group = json.filterGroups[f.substring(1)];
				return group? filterTree(json,group) : vf(f) || nofg(f);
			}
			else {
				return json.filters[f] || vf(f) || nof(f);
			}
		});
		return function(entry) {
			return fns.some(fn=>fn(entry));
		}
	}

	async function processorTree(json,procs) {
		var fns = asArray(procs).map(async (p)=>{
			if(p.startsWith("$")) {
				var group = json.processorGroups[p.substring(1)];
				return group? processorTree(json,group) : nopg(p);
			}
			else {
				var def = json.processors[p];
				let fn = def? await Processors.instance(p,def.type,def.config) : nop(p);
				fn.$def = def;
				json.modules.processors[fn.id] = fn;
				return fn;
			}
		});
		fns = await Promise.all(fns);
		return flatten(fns);
	}

	async function transTree(json,transporters,mode) {
		var trs = asArray(transporters).map(async (tr)=>{
			if(tr.startsWith("$")) {
				var group = json.transporterGroups[tr.substring(1)];
				return group? await transTree(json,group.transporters,group.mode||MODE) : notrg(tr);
			}
			else {
				var def = json.transporters[tr];
				let fn = def? await Transporters.instance(tr,def.type,def.config) : notr(tr);
				fn.$def = def;
				json.modules.transporters[fn.id] = fn;
				return fn;
			}
		});
		trs = await Promise.all(trs);
		return {list:trs,mode:mode||MODE};
	}

	function flattenFlows(flows) {
		let ret = [];
		flows.forEach(f=>{
			if(f.flows && f.flows.length) {
				let children = f.flows;
				delete f.flows;
				flatten(children).forEach(child=>{
					ret.push(extend({},f,child));
				});
			}
			else ret.push(f);
		});
		return ret;
	}

	json.flows = flattenFlows(json.flows);
	let fready = json.flows.map((flow,i)=>{
		flow.from = flow.from || "*";
		flow.when = flow.when || "*";
		flow.transporters = flow.transporters || [];
		flow.processors = flow.processors || [];
		flow.id = flow.id || `flow_${i}`;

		return Promise.all([
			processorTree(json,flow.processors).then(r=>flow.processors=r),
			filterTree(json,flow.from).then(r=>flow.from=r),
			filterTree(json,flow.when).then(r=>flow.when=r),
			transTree(json,flow.transporters,flow.mode||MODE).then(r=>flow.transporters=r)
		]);
	});

	await Promise.all(fready);
}

module.exports = {
	read : read,
	Transporters : Transporters,
	Processors : Processors
}
