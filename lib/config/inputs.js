/**
 * Inputs factory and registry
 * @module config/inputs
 */
const
	path = require('path'),
	exec = require('child_process').exec,
	Transform = require('stream').Transform,
	Writable = require('stream').Writable;

const INPUTS = {
	null : require("../input/null"),
	stdin : require("../input/stdin"),
	command : require("../input/command"),
	udp : require("../input/udp"),
	tcp : require("../input/tcp"),
	http : require("../input/http"),
	httpserver : require("../input/http-server"),
	syslog : require("../input/syslog"),
	file : require("../input/file"),
	windows : require("../input/windows"),
	kafka : require("../input/kafka"),
	redis : require("../input/redis"),
	mongo : require("../input/mongo"),
	zmq : require("../input/zmq"),
	ws : require("../input/ws"),
	elastic : require("../input/elastic")
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
 * Creates and configures an instance of an input component
 * @param  {string} id Instance ID
 * @param  {string} type Input type ID
 * @param  {object} config  Input configuration
 * @param  {boolean} disabled If true, component will not be configured neither run
 * @return {Promise<Input>} Input instance
 */
function instance(id,type,config,disabled) {
	let cls = disabled? INPUTS.null : (INPUTS[type] || INPUTS.null);
	let instance = new cls(id,type);
	instance.id = id;
	instance.type = type;

	return new Promise((ok,rej)=>{
		instance.configure(config||{},(err)=>err?rej(err):ok(instance));
	});
}

/**
 * Register a new Input component type
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
		err = `Missing Input ID : ${JSON.stringify(component)}`
	}
	else if(!component.require) {
		err = `Missing Input require path : ${JSON.stringify(component)}`
	}
	else {
		let req = component.require;
		if(req.indexOf("/")>=0)
			req = path.resolve(basepath+"/"+req);

		try {
			INPUTS[component.id] = require(req);
		}catch(error) {
			if(!component.auto) err = error;
			else {
				try {
					await npmi(req);
					INPUTS[component.id] = require(req);
				}catch(error){
					err = error;
				}
			}
		}
	}

	if(callback) callback(err,INPUTS[component.id]);
	else if(err) throw err;
	else return INPUTS[component.id];
}

function Null() {
	return INPUTS.null;
}

/**
 * Inputs module methods
 * @type {Object}
 */
module.exports = {
	register : register,
	instance : instance
}
