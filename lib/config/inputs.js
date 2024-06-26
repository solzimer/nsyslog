const
	path = require('path'),
	logger = require('../logger'),
	srequire = require('./srequire'),
	exec = require('child_process').exec;

const INPUTS = {
	null : srequire("../input/null"),
	static : srequire("../input/static"),
	stdin : srequire("../input/stdin"),
	command : srequire("../input/command"),
	udp : srequire("../input/udp"),
	tcp : srequire("../input/tcp"),
	http : srequire("../input/http"),
	httpsm : srequire("../input/httpsm"),
	httpserver : srequire("../input/http-server"),
	syslog : srequire("../input/syslog"),
	file : srequire("../input/file"),
	windows : srequire("../input/windows"),
	kafka : srequire("../input/kafka"),
	redis : srequire("../input/redis"),
	amqp : srequire("../input/amqp"),
	mongo : srequire("../input/mongo"),
	sqlserver : srequire("../input/sqlserver"),
	zmq : srequire("../input/zmq"),
	ws : srequire("../input/ws"),
	elastic : srequire("../input/elastic"),
	machine : srequire("../input/machine")
};

Object.keys(INPUTS).forEach(p=>{
	if(INPUTS[p]===null) {
		logger.warn(`Input module ${p} couldn't be loaded. Proceeding with 'null' input`);
		INPUTS[p] = require('../input/null');
	}
});

function npmi(module) {
	return new Promise((ok,rej)=>{
		exec(`npm i ${module}`,(err,body)=>{
			if(err) rej(err);
			else ok();
		});
	});
}

/**
 * Null input
 * @memberof Config.Inputs
 * @return {Input} A Null input
 */
function Null() {
	return INPUTS.null;
}

/**
 * Register a new Input component type
 * @memberof Config.Inputs
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
		err = `Missing Input ID : ${JSON.stringify(component)}`;
	}
	else if(!component.require) {
		err = `Missing Input require path : ${JSON.stringify(component)}`;
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

/**
 * Creates and configures an instance of an input component
 * @memberof Config.Inputs
 * @param  {string} id Instance ID
 * @param  {string} type Input type ID
 * @param  {object} config  Input configuration
 * @param  {boolean} disabled If true, component will not be configured neither run
 * @return {Promise<Input>} Input instance
 */
async function instance(id,type,config,disabled) {
	let cls = disabled? INPUTS.null : (INPUTS[type] || INPUTS.null);
	let instance = new cls(id,type);
	instance.id = id;
	instance.type = type;

	return new Promise((ok,rej)=>{
		instance.configure(config||{},(err)=>err?rej(err):ok(instance));
	});
}

/**
 * Inputs registry
 * @memberof Config
 * @class
 */
const Inputs = {
	instance,
	register,
	Null
};

module.exports = Inputs;
