const
	path = require('path'),
	exec = require('child_process').exec,
	Transform = require('stream').Transform,
	Writable = require('stream').Writable;

const INPUTS = {
	null : require("../input/null"),
	stdin : require("../input/stdin"),
	udp : require("../input/udp"),
	tcp : require("../input/tcp"),
	syslog : require("../input/syslog"),
	file : require("../input/file"),
	windows : require("../input/windows"),
	kafka : require("../input/kafka"),
	zmq : require("../input/zmq"),
	ws : require("../input/ws"),
};

function npmi(module) {
	return new Promise((ok,rej)=>{
		exec(`npm i ${module}`,(err,body)=>{
			if(err) rej(err);
			else ok();
		});
	});
}

function instance(id,type,config) {
	let cls = INPUTS[type] || INPUTS.null;
	let instance = new cls(id,type);
	instance.id = id;
	instance.type = type;

	return new Promise((ok,rej)=>{
		instance.configure(config,(err)=>err?rej(err):ok(instance));
	});
}

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

module.exports = {
	register : register,
	instance : instance
}
