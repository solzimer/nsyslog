const
	Transform = require('stream').Transform;
	Writable = require('stream').Writable;

const TRANSPORTERS = {
	null : require("../transporter/null.js"),
	file : require("../transporter/file.js"),
	console : require("../transporter/console.js")
};

function get(type) {
	return TRANSPORTERS[type] || TRANSPORTERS.null;
}

function Null() {
	return instance();
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
	var trdef = get(type);
	var tr = new trdef(config);

	var transform = new Transform({
		objectMode : true,
		transform(entry,encoding,callback) {
			tr.send(entry,callback);
		}
	});
	transform.id = id;
	return transform;
}

module.exports = {
	register : function(){},
	get : get,
	Null : Null,
	End : End,
	instance : instance
}
