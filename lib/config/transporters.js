const
	path = require("path"),
	Transform = require('stream').Transform,
	Writable = require('stream').Writable;

const TRANSPORTERS = {
	null : require("../transporter/null"),
	file : require("../transporter/file"),
	console : require("../transporter/console"),
	mongo : require("../transporter/mongo"),
	stat : require("../transporter/stat"),
	syslog : require("../transporter/syslog"),
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

function get(type) {
	return TRANSPORTERS[type] || TRANSPORTERS.null;
}

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

function Null() {
	return new Transform({
		objectMode : true,
		transform(entry,encoding,callback) {
			callback(null,entry);
		}
	});
}

function End() {
	return new Writable({
		objectMode : true,
		write(entry,encoding,callback) {
			callback();
		}
	});
}

async function instance(id,type,config) {
	var tr = INSTANCES[id];
	if(!tr) {
		var trdef = get(type);
		tr = new trdef(id);
		tr.id = id;
		await new Promise((ok,rej)=>{
			tr.configure(config,(err)=>{if(err) rej(err); else ok()});
		});
		INSTANCES[id] = tr;
	}

	return tr;
}

module.exports = {
	register : register,
	get : get,
	Null : Null,
	End : End,
	instance : instance
}
