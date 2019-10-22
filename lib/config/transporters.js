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

function get(type) {
	if(!TRANSPORTERS[type])
		logger.warn(`Transporter ${type} not found. Redirecting to NULL`);
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

function wrapStream(stream,id) {
	stream.instance = {id:`${id}_${Component.nextSeq()}`};
	Component.handlePipe(stream);
	return stream;
}

function Null() {
	return wrapStream(new Transform({
		objectMode : true,
		highWaterMark:10,
		transform(entry,encoding,callback) {
			callback(null,entry);
		}
	}),'Null');
}

function End() {
	return wrapStream(new Writable({
		objectMode : true,
		highWaterMark:10,
		write(entry,encoding,callback) {
			callback();
		}
	}),'End');
}

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

module.exports = {
	register : register,
	get : get,
	Null : Null,
	End : End,
	instance : instance
}
