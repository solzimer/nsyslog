const
	logger = require('../logger'),
	fs = require("fs-extra"),
	path = require("path"),
	extend = require("extend"),
	Inputs = require("./inputs"),
	Transporters = require("./transporters"),
	Processors = require("./processors"),
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
async function read(file,callback) {
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

		await processInputs(json); 	// Get Inputs
		processFilters(json);				// Get Filters
		await processFlows(json);		// Get Flows
		extendConfig(json);					// Extend modules config

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
	res.forEach(njson=>extend(true,json,njson));
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

async function processInputs(json) {
	let all = [];

	for(var i in json.inputs) {
		var def = json.inputs[i];
		all.push(Inputs.instance(i,def.type,def.config));
	}

	let inputs = await Promise.all(all);
	inputs.forEach(input=>{
		json.modules.inputs[input.id] = input;
	});
}

function processFilters(json) {
	json.filters = json.filters || {};
	json.filters["*"] = "true";
	json.filterGroups = json.filterGroups || {};

	for(var i in json.filters) {
		var val = json.filters[i];
		json.filters[i] = expression.fn(val);
		json.filters[i].id = val;
	}
}

function processFilter(val) {
		try {
			return expression.fn(val);
		}
		catch(err) {
			return null;
		}
}

async function processFlows(json) {
	const
		MODE = "parallel",
		voidfn = function() {return false;},
		voidtr = ()=>Transporters.instance("NULL"),
		voidpr = ()=>Processors.instance("NULL"),
		vf = function(val){try{
			return expression.fn(val)
		}catch(err){
			return null
		}},
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
				return def? await Processors.instance(p,def.type,def.config) : nop(p);
			}
		});
		fns = await Promise.all(fns);
		fns.forEach(fn=>json.modules.processors[fn.id]=fn);
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
				return def? await Transporters.instance(tr,def.type,def.config) : notr(tr);
			}
		});
		trs = await Promise.all(trs);
		trs.forEach(tr=>json.modules.transporters[tr.id]=tr);
		return {list:trs,mode:mode||MODE};
	}

	function flatten(flows) {
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

	json.flows = flatten(json.flows);
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

function extendConfig(json) {
	let
		modules = json.modules,
		cfg = json.config;

	Object.keys(modules.inputs).forEach(id=>{
		let input = modules.inputs[id];
		input.maxPending = json.inputs[id].maxPending || cfg.input.maxPending;
	});

	Object.keys(modules.processors).forEach(id=>{
		let pr = modules.processors[id];
		pr.maxPending = json.processors[id].maxPending || cfg.processor.maxPending;
	});

	Object.keys(modules.transporters).forEach(id=>{
		let tr = modules.transporters[id];
		tr.maxPending = json.transporters[id].maxPending || cfg.transporter.maxPending;
	});
}


module.exports = {
	read : read,
	Transporters : Transporters,
	Processors : Processors
}
