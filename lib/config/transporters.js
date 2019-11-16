const
	path = require("path"),
	logger = require('../logger'),
	Component = require('../component'),
	Transform = require('stream').Transform,
	Writable = require('stream').Writable;

const TRANSPORTERS = {
	null : require("../transporter/null"),
	file : require("../transporter/file"),
	http : require("../transporter/http"),
	console : require("../transporter/console"),
	elastic : require("../transporter/elastic"),
	mongo : require("../transporter/mongo"),
	stat : require("../transporter/stat"),
	syslog : require("../transporter/syslog"),
	zmq : require("../transporter/zmq"),
	kafka : require("../transporter/kafka"),
	redis : require("../transporter/redis"),
	reemit : require("../transporter/reemit")
};

var INSTANCES = {

}

function npmi(module) {
	return new Promise((ok,rej)=>{
		exec(`npm i ${module}`,(err,body)=>{
			if(err) rej(err);
			else ok();
		});
	});
}

/**
 * Gets a transporter class by its type ID
 * @memberof Config.Transporters
 * @param  {string} type Transporter type ID
 * @return {Transporter} Transporter class
 */
function get(type) {
	if(!TRANSPORTERS[type])
		logger.warn(`Transporter ${type} not found. Redirecting to NULL`);
	return TRANSPORTERS[type] || TRANSPORTERS.null;
}

/**
 * Register a new Transporter component type
 * @memberof Config.Transporters
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
		err = `Missing Transporter ID : ${JSON.stringify(component)}`
	}
	else if(!component.require) {
		err = `Missing Transporter require path : ${JSON.stringify(component)}`
	}
	else {
		let req = component.require;
		if(req.indexOf("/")>=0)
			req = path.resolve(basepath+"/"+req);

		try {
			TRANSPORTERS[component.id] = require(req);
		}catch(error) {
			if(!component.auto) err = error;
			else {
				try {
					await npmi(req);
					TRANSPORTERS[component.id] = require(req);
				}catch(error){
					err = error;
				}
			}
		}
	}

	if(callback) callback(err,TRANSPORTERS[component.id]);
	else if(err) throw err;
	else return TRANSPORTERS[component.id];
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
 * @memberof Config.Transporters
 * @returns {stream}
 */
function Null() {
	return wrapStream(new Transform({
		objectMode : true,
		highWaterMark:10,
		transform(entry,encoding,callback) {
			callback(null,entry);
		}
	}),'Null');
}

/**
 * @description <p>Creates an End writable stream</p>
 * <p>An End stream is like a Null stream,
 * but instead of a transform instance, it's a writable one.
 * This means that, as a writable stream, data can be written,
 * but no read, so its an end way</p>
 * @memberof Config.Transporters
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
 * Creates and configures an instance of a transporter component
 * @memberof Config.Transporters
 * @param  {string} id Instance ID
 * @param  {string} type Transporter type ID
 * @param  {object} config  Transporter configuration
 * @param  {boolean} disabled If true, component will not be configured neither run
 * @return {Promise<Transporter>} Transporter instance
 */
async function instance(id,type,config,disabled) {
	var tr = INSTANCES[id];
	if(!tr) {
		var trdef = get(disabled? 'null' : type);
		tr = new trdef(id,type);
		tr.id = id;
		INSTANCES[id] = tr;
		await new Promise((ok,rej)=>{
			tr.configure(config||{},(err)=>{if(err) rej(err); else ok()});
		});
	}

	return tr;
}

/**
 * Transporters registry
 * @memberof Config
 * @class
 */
const Transporters = {
	register : register,
	get : get,
	Null : Null,
	End : End,
	instance : instance
}

module.exports = Transporters;
