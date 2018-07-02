const
	path = require('path'),
	exec = require('child_process').exec,
	Transform = require('stream').Transform,
	Writable = require('stream').Writable;

const PROCESSORS = {
	null : require("../processor"),
	properties : require("../processor/properties"),
	filter : require("../processor/filter"),
	syslogparser : require("../processor/syslogparser"),
	timestamp : require("../processor/timestamp"),
	multilang : require("../processor/multilang"),
	stats : require("../processor/stats")
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
	return PROCESSORS[type] || PROCESSORS.null;
}

async function register(basepath,component,callback) {
	let err = null;

	if(!component.id) {
		err = `Missing Processor ID : ${JSON.stringify(component)}`
	}
	else if(!component.require) {
		err = `Missing Processor require path : ${JSON.stringify(component)}`
	}
	else {
		let req = component.require;
		if(req.indexOf("/")>=0)
			req = path.resolve(basepath+"/"+req);

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

function Null() {
	return instance();
}

function Init() {
	return new Transform({
		objectMode:true,
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
	var pr = INSTANCES[id];
	if(!pr) {
		var prdef = get(type);
		pr = new prdef(id);
		pr.id = id;
		await new Promise((ok,rej)=>{
			pr.configure(config,(err)=>err?rej(err):ok());
		})
		INSTANCES[id] = pr;
	}

	return pr;
}

module.exports = {
	register : register,
	get : get,
	Null : Null,
	End : End,
	Init : Init,
	instance : instance
}
