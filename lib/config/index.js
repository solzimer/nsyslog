const
	logger = require('../logger'),
	fs = require("fs-extra"),
	path = require("path"),
	extend = require("extend"),
	mingo = require('mingo'),
	jsonlint = require('jsonlint'),
	os = require('os'),
	Inputs = require("./inputs"),
	Transporters = require("./transporters"),
	Transporter = require('../transporter'),
	Processors = require("./processors"),
	Flow = require('./flow'),
	TLS = require('../tls'),
	expression = require("jsexpr"),
	pexpr = expression.newInstance('@');


/**
 * Master process identifier constant
 * @type {String}
 * @memberof Config
 */
const MASTER_PROC = "$$master";

const MAX_PENDING = 100;
const M_TYPES = ['inputs','processors','transporters','processorGroups','transporterGroups'];

/**
 * Configuration error types
 * @enum
 * @memberof Config
 */
const ERR_CATS = {
	parse : 'parse',
	duplicate : 'duplicate',
	iderr : 'iderr',
	register: 'register',
	expr : 'expression'
};

const DEF_CONF = {
	input : {maxPending:MAX_PENDING},
	buffer : {maxPending:MAX_PENDING},
	processor : {maxPending:MAX_PENDING},
	transporter : {maxPending:MAX_PENDING}
};

// Flatten an array of nested arrays of nested arrays...
const flatten = arr => arr.reduce(
  (a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []
);

// Simple function to unify flow attributes as arrays
function asArray(v) {
	if(!Array.isArray(v)) return [v];
	else return v;
}

function getDataAccess(datadir) {
	let dpath = path.resolve(datadir);
	let tmpFile = `tmp_nsyslog_${Math.random()}`;
	let canWrite = true;
	try {
		fs.mkdirpSync(dpath);
		fs.writeFileSync(`${dpath}/${tmpFile}`,'test','utf-8');
		fs.unlinkSync(`${dpath}/${tmpFile}`);
	}catch(err) {
		canWrite = false;
	}

	if(canWrite) return dpath;
	else {
		let lpath = dpath.split(/\\|\//).pop().trim();
		let ndpath = path.resolve(os.tmpdir(),`nsyslog/${lpath}`);
		logger.warn(`Cannot write on folder '${dpath}'. Agent will use '${ndpath}'`);
		return ndpath;
	}
}

/**
 * Reads the main configuration file and retrieve
 * the instances of servers, filters, processors
 * and transformers
 * @memberof Config
 * @param {string} file Main configuration file path
 * @param {Function} callback callback function
 * @param {object} options Read options
 * @param {boolean} options.validateOnly Don't process config file, only validate
 * @returns {Config}
 */
async function read(file,callback,options) {
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
		let jsonErrors = [];
		if(typeof(file)=='object') {
			json = file;
		}
		else {
			// Includes and merges all the configuration files
			jsonErrors = await imports("",json);
			if(jsonErrors.some(err=>err.sev=='error')) {
				json.$$errors = jsonErrors;
				return json;
			}
		}

		// Gets the raw json before replacing keys with
		// actual instances of components
		let raw = JSON.parse(JSON.stringify(json));

		let props = json.properties || false;
		if(props) {
			let expr = pexpr.expr(json);
			json = expr(props);
		}

		json.config = extend(true,{},DEF_CONF,json.config);
		json.config.datadir = getDataAccess(json.config.datadir || './db');
		json.modules = {inputs:{},processors:{},transporters:{}};
		json.$file = raw.$file = json.$file || file;
		json.$filepath = raw.$filepath = path.resolve(json.$file);
		json.$path = raw.$path = path.dirname(json.$filepath);
		json.$datadir = raw.$datadir = path.resolve(json.config.datadir||process.cwd());

		// Set defaults for TLS
		TLS.defaults({},json.$path);
		sanitizeModules(json);												// Extend modules config
		let sflowErrors = sanitizeFlows(json);				// Sanitize flow configs

		let inputErrors = await processInputs(json);	// Get Inputs
		let filterErrors = processFilters(json);			// Get Filters
		let flowErrors  = await processFlows(json);		// Get Flows

		let errors = flatten([].concat(
			jsonErrors,sflowErrors,inputErrors,
			filterErrors,flowErrors
		)).filter(Boolean);

		let ncfg = new Config(json);
		ncfg.$$errors = errors.length? errors : null;
		ncfg.$$raw = raw;
		if(callback) callback(ncfg.$$errors,ncfg,raw);
		else {
			return ncfg;
		}
	}catch(err) {
		if(callback) callback(err);
		else throw err;
	}
}

/**
 * Imports recursively nested configuration files, and registers
 * custom components. The final result is the merged configuration
 * @private
 */
async function imports(file,json,errors) {
	errors = errors || [];
	var basepath = path.dirname(file);

	let all = (json.include || []).map(async f=>{
		let ifile = path.resolve(basepath,f);
		let ipath = path.dirname(ifile);
		let data = await fs.readFile(ifile,"utf-8");
		let njson = {};
		try {
			njson = jsonlint.parse(data);
		}catch(err) {
			errors.push({sev:'error',cat:ERR_CATS.parse,path:ifile,err});
		}

		// Set filename on each module
		(njson.flows||[]).forEach(f=>f.$$filename=ifile);
		M_TYPES.forEach(pk=>{
			Object.keys(njson[pk]||{}).forEach(k=>njson[pk][k].$$filename=ifile);
		});

		// Register components
		errors = await registerComponents(basepath,ipath,njson,errors,ifile);
 		errors = await imports(ifile,njson,errors);

		// Check duplicated IDs
		errors.push(checkDuplicates(json,njson));

		return njson;
	});
	let res = await Promise.all(all);

	// Merge parent file with nested includes
	res.forEach(njson=>{
		let flows = njson.flows;
		delete njson.flows;
		extend(true,json,njson);
		json.flows = [].concat(json.flows||[]).concat(flows||[]);
	});

	return errors;
}

function checkDuplicates(json1,json2) {
	let duplicates = [];

	function match(type,vals1,vals2) {
		let map = new Set(Object.keys(vals1||{}));
		Object.keys(vals2||{}).forEach(k=>{
			if(map.has(k)) duplicates.push({sev:'warn',cat:ERR_CATS.duplicate,type,id:k,path:vals2[k].$$filename});
			else map.add(k);
		});
	}

	match('input',json1.inputs,json2.inputs);
	match('processor',json1.processors,json2.processors);
	match('transporter',json1.transporters,json2.transporters);
	match('processorGroup',json1.processorGroups,json2.processorGroups);
	match('transporterGroup',json1.transporterGroups,json2.transporterGroups);

	return duplicates;
}

/**
 * Register custom components
 * @private
 */
async function registerComponents(basepath,ipath,json,errors,ifile) {
	errors = errors || [];
	var comps = json.register || [];

	var voidfn = (basepath,cmp)=>{
		throw new Error(`Invalid component type ${cmp.id} => ${cmp.type}`);
	};

	// For every declared component
	let all = comps.map(async(cmp)=>{
		let register = voidfn;
		if(cmp.type=="processor") register = Processors.register;
		else if(cmp.type=="transporter") register = Transporters.register;
		else if(cmp.type=="input") register = Inputs.register;

		try {
			let rpath = cmp.basepath? path.resolve(ipath,cmp.basepath) : basepath;
			console.log(`BASEPATH ${rpath}`);
			await register(rpath,cmp);
		}catch(err) {
			errors.push({sev:'error',cat:ERR_CATS.register,err:err,path:ifile});
		}
	});

	await Promise.all(all);
	return errors;
}

function sanitizeModules(json) {
	let cfg = json.config;
	let opath = {$path:json.$path,$filepath:json.$filepath,$datadir:json.$datadir};
	let owhen = {filter:false,bypass:false};
	let modules = [json.inputs,json.processors,json.transporters];

	extend(true,json,{
		inputs:{},
		processors:{},
		transporters:{},
		processorGroups:{},
		transporterGroups:{}
	});

	extend(true,json.$$raw,{
		inputs:{},
		processors:{},
		transporters:{},
		processorGroups:{},
		transporterGroups:{},
	});

	modules.forEach(modules=>{
		for(let i in modules) {
			let def = modules[i];

			def.config = extend({},def.config,opath);
			def.maxPending = def.maxPending || cfg.input.maxPending;
			def.buffer = def.buffer || false;
			def.when = extend({},owhen,def.when);
			def.then = extend({},owhen,def.then);
		}
	});
}

function sanitizeFlows(json,errors) {
	errors = errors || [];
	let i=0, map = {};

	function flatten(flows,parent) {
		let ret = [];
		parent = parent || {};
		parent.transporters = parent.transporters || [];
		if(!Array.isArray(parent.transporters)) parent.transporters = [parent.transporters];

		flows.forEach(flow=>{
			// Push flow
			ret.push(flow);

			// Set flow ID
			flow.id = flow.id || `Flow_${i++}`;
			if(!map[flow.id]) map[flow.id] = true;
			else errors.push({sev:'warn',cat:ERR_CATS.duplicate,type:'flow',id:flow.id,path:flow.$$filename});

			// Set parent reemit
			if(!parent.transporters.find(tr=>tr==`#${flow.id}`))
				parent.transporters.push(`#${flow.id}`);

			// flatten flow children
			if(flow.children) {
				flow.children.forEach(f=>{
					f.fork = flow.id;
					f.from = "false";
					f.disabled = flow.disabled;
				});

				ret = ret.concat(flatten(flow.children,flow));
			}
		});
		return ret;
	}

	// Flatten flow hierarchy
	json.modules.flows = flatten(json.flows).map(f=>new Flow(f.id,f));

	// Active flows and fork hierarchy
	let flows = json.modules.flows.filter(f=>!f.disabled);
	let flowmap = flows.reduce((map,f)=>{map[f.id] = f; return map;},{});
	let fdirty = false;
	do {
		fdirty = false;
		flows.forEach(f=>{
			if(typeof(f.fork)=='string') {
				if(!flowmap[f.fork]) {
					logger.warn(`Flow ${f.id} is attached to ${f.fork} which is disabled. Disabling ${f.id}`);
					f.disabled = true;
					delete flowmap[f.id];
					fdirty = true;
				}
				else {
					f.fparent = f.fork;
					f.fork = flowmap[f.fork].fork;
					logger.info(`flow ${f.id} is attached to ${f.fparent}`);
					fdirty = true;
				}
			}
		});
	}while(fdirty);

	return errors;
}

async function processInputs(json) {
	let all = [];

	for(var i in json.inputs) {
		var def = json.inputs[i];
		all.push(Inputs.instance(i,def.type,def.config,def.disabled));
	}

	let inputs = await Promise.all(all);
	inputs.forEach(input=>{
		input.$def = json.inputs[input.id];
		json.modules.inputs[input.id] = input;
	});
}

function processFilters(json, errors) {
	errors = errors || [];

	json.filters = json.filters || {};
	json.filters["*"] = "true";
	json.filterGroups = json.filterGroups || {};

	json.flows.forEach(flow=>{
		if(!json.filters[flow.from] && /^[a-zA-Z0-9_\-\$\#]+$/.test(flow.from))
		 	json.filters[flow.from] = '${input}=="'+flow.from+'"';
	});

	logger.debug('Configured filters',Object.keys(json.filters));

	for(var i in json.filters) {
		var val = json.filters[i];
		try {
			json.filters[i] = expression.fn(val);
			json.filters[i].id = val;
		}catch(err) {
			json.filters[i].id = ()=>false;
			errors.push({sev:'error',cat:ERR_CATS.expr,msg:'Error evaluating expression',expression:JSON.stringify(val)});
		}
	}

	return errors;
}

async function processFlows(json) {
	var errors = [];
	const
		MODE = "parallel",
		voidfn = function() {return false;},
		voidtr = (id)=>Transporters.instance("NULL",id),
		voidpr = (id)=>Processors.instance("NULL",id),
		nof = function(f){errors.push({sev:'error',cat:ERR_CATS.iderr,msg:`Filter '${f}' doesn't exist`}); return voidfn;},
		nofg = function(f){errors.push({sev:'error',cat:ERR_CATS.iderr,msg:`Filter Group '${f}' doesn't exist`}); return voidfn;},
		nop = function(f){errors.push({sev:'error',cat:ERR_CATS.iderr,msg:`Processor '${f}' doesn't exist`}); return voidpr(f);},
		nopg = function(f){errors.push({sev:'error',cat:ERR_CATS.iderr,msg:`Processor Group '${f}' doesn't exist`}); return voidpr(f);},
		notr = function(tr){errors.push({sev:'error',cat:ERR_CATS.iderr,msg:`Transporter '${tr}' doesn't exist`}); return voidtr(tr);},
		notrg = function(tr){errors.push({sev:'error',cat:ERR_CATS.iderr,msg:`Transporter Group '${tr}' doesn't exist`}); return voidtr(tr);},
		vf = function(val){
			try{
				if(typeof(val)=='object') {
					let query = new mingo.Query(val);
					return (entry)=>query.test(entry);
				}
				else if(typeof(val)=='string') {
					return expression.fn(val);
				}
				else {
					return ()=>val;
				}
			}catch(err){
				errors.push({sev:'error',cat:ERR_CATS.expr,msg:'Error evaluating expression',expression:JSON.stringify(val)});
				return ()=>false;
			}
		};

	async function filterTree(json,filters) {
		var fns = asArray(filters).map(f=>{
			if(typeof(f)=='string' && f.startsWith("$")) {
				var group = json.filterGroups[f.substring(1)];
				return group? filterTree(json,group) : vf(f) || nofg(f);
			}
			else {
				return json.filters[f] || vf(f) || nof(f);
			}
		});
		return function(entry) {
			try {
				return fns.some(fn=>fn(entry));
			}catch(err) {
				return false;
			}
		};
	}

	async function processorTree(json,procs) {
		var fns = asArray(procs).map(async (p)=>{
			if(p.startsWith("$")) {
				var group = json.processorGroups[p.substring(1)];
				return group? processorTree(json,group) : nopg(p);
			}
			else {
				var def = json.processors[p];
				let fn = def? await Processors.instance(p,def.type,def.config,def.disabled) : nop(p);
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
				var def = tr.startsWith('#')? json.transporters['#'] : json.transporters[tr];
				let fn = def? await Transporters.instance(tr,def.type,def.config,def.disabled) : notr(tr);
				fn.$def = def;
				json.modules.transporters[fn.id] = fn;
				return fn;
			}
		});
		trs = await Promise.all(trs);
		return {list:trs,mode:mode||MODE};
	}

	let fready = json.modules.flows.map((flow,i)=>{
		flow.from = flow.from || "false";
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
	return errors;
}

/**
 * Configuration manager
 * @namespace
 * @class
 * @description Configuration Object / Manager
 * @param {object} def Configuration definition object
 * @example
 * const {Config} = require('nsyslog').Core;
 * let cfg = await Config.read('config.json',(errs)=>console.log(errs));
 */
class Config {
	constructor(def) {
		/** @property {string} $datadir Data folder */
		this.$datadir = def.$datadir;
		/** @property {string} $file Config file name */
		this.$file = def.$file;
		/** @property {string} $filepath Config absolute file name */
		this.$filepath = def.$filepath;
		/** @property {string} $path Config absolute file path */
		this.$path = def.$path;

		/** @property {object} $$raw JSON parsed config file (with merged included secondary files) */
		this.$$raw = def.$$raw;
		/** @property {array} $$errors Configuration errors */
		this.$$errors = def.$$errors;

		/** @property {object} inputs Input declarations */
		this.inputs = def.inputs;
		/** @property {object} processors Processor declarations */
		this.processors = def.processors;
		/** @property {object} transporters Transporter declarations */
		this.transporters = def.transporters;
		/** @propertu {Array<Flow>} flows Flow instances */
		this.flows = [].concat(def.modules.flows);

		/**
		 * @property {object} modules Configuration instanced modules
		 * @property {Array<Flow>} modules.flows Flows
		 * @property {object<String,Input>} modules.inputs Map of id/Input intances
		 * @property {object<String,Processor>} modules.processors Map of id/Processor intances
		 * @property {object<String,Transporter>} modules.transporters Map of id/Transporter intances
		 */
		this.modules = def.modules;

		Object.assign(this,def);
	}

	/**
	 * Transform Config instance to a serializable JSON object
	 * @return {object} JSON object
	 */
	toJSON() {
		let json = Object.assign({},this);
		delete json.modules;
		delete json.flows;
		return json;
	}

	/**
	 * Splits configuration into its fork processes counterparts
	 * @return {array<Config>} Array of splitted configurations
	 */
	split() {
		let modules = this.modules;

		let pmap = {[MASTER_PROC] : {cfg:extend(true,{},this),flows:[]}};
		let flowmap = {};
		let assign = (id,flow)=>{
			if(!pmap[id]) pmap[id] = {cfg:extend(true,{},this),flows:[]};
			pmap[id].flows.push(flow);
		};
		let trflatten = (trs,arr)=>{
			arr = arr || new Set();
			if(trs instanceof Transporter) arr.add(trs.id);
			else if(trs.list) trs.list.forEach(tr=>trflatten(tr,arr));
			return arr;
		};

		modules.flows.forEach(flow=>{
			if(!flow.fork) assign(MASTER_PROC,flow);
			else if(flow.fork && !flow.fparent) assign(flow.id,flow);
			else if(flow.fork) assign(flow.fparent,flow);
			flowmap[flow.id] = flow;
		});

		// Prune inputs from processes that don't need them
		Object.keys(this.inputs).forEach(ki=>{
			let input = this.inputs[ki];

			// Input is attached to specific flows
			if(input.attach && input.attach.length) {
				Object.keys(pmap).forEach(pk=>{
					let flows = pmap[pk].flows;
					let attach = new Set(input.attach);

					// Detach from process
					if(!flows.some(f=>attach.has(f.id))) {
						logger.debug(`Input '${ki}' attached to [${input.attach.join(',')}]. Removing from flow process '${pk}'`);
						delete pmap[pk].cfg.inputs[ki];
						delete pmap[pk].cfg.$$raw.inputs[ki];
						delete pmap[pk].cfg.modules.inputs[ki];
					}
				});
			}
			else {
				let forked = Object.keys(pmap).filter(id=>id!=MASTER_PROC);
				logger.debug(`Input '${ki}' not attached. Removing from forked processes [${forked.join(',')}]`);
				forked.forEach(pk=>{
					delete pmap[pk].cfg.inputs[ki];
					delete pmap[pk].cfg.$$raw.inputs[ki];
					delete pmap[pk].cfg.modules.inputs[ki];
				});
			}
		});

		// Prune processors
		Object.keys(pmap).forEach(pk=>{
			// Map processors used by process
			let pset = new Set();
			pmap[pk].flows.forEach(flow=>{
				flow.processors.forEach(p=>pset.add(p.id));
			});

			logger.debug(`flow process '${pk}' has processors`,pset);
			// Removed unused processors
			Object.keys(pmap[pk].cfg.processors).forEach(prk=>{
				if(!pset.has(prk)) {
					delete pmap[pk].cfg.processors[prk];
					delete pmap[pk].cfg.$$raw.processors[prk];
					delete pmap[pk].cfg.modules.processors[prk];
					logger.debug(`Processor '${prk}' removed from flow process '${pk}'`);
				}
			});
		});

		// Prune transporters
		Object.keys(pmap).forEach(pk=>{
			// Map transporters used by process
			let pset = new Set();
			pmap[pk].flows.forEach(flow=>{
				let trids = trflatten(flow.transporters);
				trids.forEach(trid=>pset.add(trid));
			});

			logger.debug(`flow process '${pk}' has transporters`,pset);
			// Removed unused processors
			Object.keys(pmap[pk].cfg.transporters).forEach(prk=>{
				if(prk.startsWith('#')) return;
				if(!pset.has(prk)) {
					delete pmap[pk].cfg.transporters[prk];
					delete pmap[pk].cfg.$$raw.transporters[prk];
					delete pmap[pk].cfg.modules.transporters[prk];
					logger.debug(`Transporter '${prk}' removed from flow process '${pk}'`);
				}
			});
		});

		// Prune flows
		Object.keys(pmap).forEach(pk=>{
			let cfg = pmap[pk].cfg;
			let flows = new Set(pmap[pk].flows.map(f=>f.id));
			cfg.flows = cfg.flows.filter(f=>flows.has(f.id));
			cfg.modules.flows = cfg.modules.flows.filter(f=>flows.has(f.id));
			cfg.$$raw.flows = cfg.flows;
		});

		pmap = Object.keys(pmap).reduce((map,pk)=>{
			map[pk] = new Config(pmap[pk].cfg);
			return map;
		},{});

		return pmap;
	}
}

Object.assign(Config,{
	read : read,
	Inputs : Inputs,
	Transporters : Transporters,
	Processors : Processors,
	Flow : Flow,
	MASTER_PROC,
	ERR_CATS
});

/**
 * Configuration elements
 * @type {Config}
 */
module.exports = Config;
