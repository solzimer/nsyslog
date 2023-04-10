const
	path = require('path'),
	logger = require('../logger'),
	exec = require('child_process').exec,
	srequire = require('./srequire'),
	Component = require('../component'),
	Transform = require('stream').Transform,
	Writable = require('stream').Writable;

const PROCESSORS = {
	null : srequire("../processor"),
	sequence : srequire("../processor/sequence"),
	array : srequire("../processor/array"),
	split : srequire("../processor/split"),
	properties : srequire("../processor/properties"),
	merge : srequire("../processor/merge"),
	filter : srequire("../processor/filter"),
	parser : srequire("../processor/parser"),
	syslogparser : srequire("../processor/syslogparser"),
	csvparser : srequire("../processor/csvparser"),
	jsonparser : srequire("../processor/jsonparser"),
	xmlparser : srequire("../processor/xmlparser"),
	winevtparser : srequire("../processor/winevtparser.js"),
	keyvalparser : srequire("../processor/keyvalparser"),
	timestamp : srequire("../processor/timestamp"),
	dateformat : srequire("../processor/dateformat"),
	multilang : srequire("../processor/multilang"),
	csvout : srequire("../processor/csvout"),
	translate : srequire("../processor/translate"),
	throttle : srequire("../processor/throttle"),
	nools : srequire("../processor/nools"),
	stats : srequire("../processor/stats"),
	transform : srequire("../processor/transform"),
	http : srequire("../processor/http"),
	crypto : srequire("../processor/crypto"),
	joiner : srequire("../processor/joiner")
};

Object.keys(PROCESSORS).forEach(p=>{
	if(PROCESSORS[p]===null) {
		logger.warn(`Processor module ${p} couldn't be loaded. Proceeding with 'null' processor`);
		PROCESSORS[p] = require("../processor");
	}
});

var INSTANCES = {

};

function npmi(module) {
	return new Promise((ok,rej)=>{
		exec(`npm i ${module}`,(err,body)=>{
			if(err) rej(err);
			else ok();
		});
	});
}

/**
 * Gets a processor class by its type ID
 * @memberof Config.Processors
 * @param  {string} type Processor type ID
 * @return {Processor} Processor class
 */
function get(type) {
	return PROCESSORS[type] || PROCESSORS.null;
}

/**
 * Register a new Processor component type
 * @memberof Config.Processors
 * @param  {basepath}   basepath  Configuration file basepath
 * @param  {object}   component Component definition
 * @param  {string}   component.id Component unique ID type
 * @param  {string}   component.require Path of required code
 * @param  {boolean}   component.auto Install package.json component dependencies if needed
 * @param  {Function} callback  callback function
 * @return {object}  imported module
 */
async function register(basepath,component,callback) {
	let err = null;

	if(!component.id) {
		err = `Missing Processor ID : ${JSON.stringify(component)}`;
	}
	else if(!component.require) {
		err = `Missing Processor require path : ${JSON.stringify(component)}`;
	}
	else {
		let req = component.require;
		if(req.indexOf("/")==0) {
			req = path.resolve(req);
		}
		else if(req.indexOf("/")>=0) {
			req = path.resolve(basepath+"/"+req);
		}
		try {
			PROCESSORS[component.id] = require(req);
		}catch(error) {
			if(!component.auto) err = error;
			else {
				try {
					await npmi(req);
					PROCESSORS[component.id] = require(req);
				}catch(error){
					err = error;
				}
			}
		}
	}

	if(callback) callback(err,PROCESSORS[component.id]);
	else if(err) throw err;
	else return PROCESSORS[component.id];
}

function wrapStream(stream,id) {
	stream.instance = {id:`${id}_${Component.nextSeq()}`};
	Component.handlePipe(stream);
	return stream;
}

/**
 * @description <p>Creates a Null transform stream</p>
 * <p>A Null transform stream simply does nothing;
 * it's a bypass stream used to pipe other streams</p>
 * @memberof Config.Processors
 * @returns {stream}
 */
function Null() {
	return instance();
}

/**
 * @description <p>Creates a Init transform stream</p>
 * <p>A Init transform stream simply does nothing;
 * it's a bypass stream used to pipe other streams</p>
 * <p>It's basically the same as {@link Null}, but with
 * other ID in order to indentify it as an initial
 * point</p>
 * @memberof Config.Processors
 * @returns {stream}
 */
function Init() {
	return wrapStream(new Transform({
		objectMode:true,
		highWaterMark:10,
		transform(entry,encoding,callback) {
			callback(null,entry);
		}
	}),'Init');
}

/**
 * @description <p>Creates an End writable stream</p>
 * <p>An End stream is like a Null stream,
 * but instead of a transform instance, it's a writable one.
 * This means that, as a writable stream, data can be written,
 * but no read, so its an end way</p>
 * @memberof Config.Processors
 * @returns {stream}
 */
function End() {
	return wrapStream(new Writable({
		objectMode : true,
		highWaterMark:10,
		write(entry,encoding,callback) {
			callback();
		}
	}),'End');
}

/**
 * Creates and configures an instance of a processor component
 * @memberof Config.Processors
 * @param  {string} id Instance ID
 * @param  {string} type Processor type ID
 * @param  {object} config  Processor configuration
 * @param  {boolean} disabled If true, component will not be configured neither run
 * @return {Promise<Processor>} Processor instance
 */
async function instance(id,type,config,disabled) {
	var pr = INSTANCES[id];
	if(!pr) {
		var prdef = get(disabled? 'null' : type);
		pr = new prdef(id);
		pr.id = id;
		INSTANCES[id] = pr;
		await new Promise((ok,rej)=>{
			pr.configure(config||{},(err)=>err?rej(err):ok());
		});
	}

	return pr;
}

/**
 * Processors registry
 * @memberof Config
 * @class
 */
const Processors = {
	register,
	instance,
	get,
	Null,
	End,
	Init,
};

module.exports = Processors;
