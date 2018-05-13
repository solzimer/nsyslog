const
	path = require('path'),
	exec = require('child_process').exec,
	Transform = require('stream').Transform,
	Writable = require('stream').Writable;

const INPUTS = {
	null : require("../input/null.js"),
	udp : require("../input/udp.js"),
	tcp : require("../input/tcp.js")
};

function npmi(module) {
	return new Promise((ok,rej)=>{
		exec(`npm i ${module}`,(err,body)=>{
			if(err) rej(err);
			else ok();
		});
	});
}

function get(type) {
	return INPUTS[type] || INPUTS.null;
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
	get : get
}
