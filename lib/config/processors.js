const
	Transform = require('stream').Transform,
	Writable = require('stream').Writable;

const PROCESSORS = {
	null : require("../processor/processor.js"),
	properties : require("../processor/properties.js"),
	filter : require("../processor/filter.js"),
	stats : require("../processor/stats.js")
};

var INSTANCES = {

}

function get(type) {
	return PROCESSORS[type] || PROCESSORS.null;
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

function instance(id,type,sticky,config) {
	var tr = INSTANCES[id];
	if(!tr) {
		var prdef = get(type);
		tr = new prdef(config||{});
		tr.id = id;
		tr.sticky = sticky;
		INSTANCES[id] = tr;
	}

	return tr;
}

module.exports = {
	register : function(){},
	get : get,
	Null : Null,
	End : End,
	Init : Init,
	instance : instance
}
