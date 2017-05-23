const
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
	register : function(){},
	get : get,
	Null : Null,
	End : End,
	instance : instance
}
