const
	path = require("path"),
	Transform = require('stream').Transform,
	Writable = require('stream').Writable;

const TRANSPORTERS = {
	null : require("../transporter/null.js"),
	file : require("../transporter/file.js"),
	console : require("../transporter/console.js"),
	mongo : require("../transporter/mongo.js"),
};

var INSTANCES = {

}

function get(type) {
	return TRANSPORTERS[type] || TRANSPORTERS.null;
}

function register(basepath,component,callback) {
	if(!component.id) {
		callback("Missing Transporter ID");
	}
	else if(!component.require) {
		callback("Missing Transporter require path");
	}
	else {
		var req = component.require;
		if(req.indexOf("/")>=0)
			req = path.resolve(basepath+"/"+req);

		try {
			TRANSPORTERS[component.id] = require(req);
			callback(null,TRANSPORTERS[component.id]);
		}catch(err) {
			if(!component.auto) {
				callback(err,null);
			}
			else {
				exec('npm i ' + req,(err,body)=>{
					try{
						TRANSPORTERS[component.id] = require(req);
						callback(null,TRANSPORTERS[component.id]);
					}catch(err){
						callback(err);
					}
				});
			}
		}
	}
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

function instance(id,type,config) {
	var tr = INSTANCES[id];
	if(!tr) {
		var trdef = get(type);
		tr = new trdef(config||{});
		tr.id = id;
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
