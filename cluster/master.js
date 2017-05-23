const cluster = require('cluster');
const Transform = require('stream').Transform;
const os = require("os");
const SIZE = os.cpus().length;
const CMD = {
	parse : "parse",
	process : "process",
	transport : "transport"
}

var workers = [];
var pid = wid = 0;
var pending = {};
var cfg = {};
var sticky = {};

function voidfn(){}

function init() {
	console.log('Master cluster setting up ' + SIZE + ' workers...');

	for(var i = 0; i < SIZE; i++) {
			workers.push(cluster.fork());
	}

	cluster.on('online',(worker) => {
			console.log('Worker ' + worker.process.pid + ' is online');
			worker.on('message', resolveEntry);
	});

	cluster.on('exit', (worker, code, signal) => {
			console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
			console.log('Starting a new worker');
			workers.splice(workers.indexOf(worker),1);
			workers.push(cluster.fork());
	});
}

function getId(sid) {
	if(sid) {
		if(isNaN(sticky[sid])) sticky[sid] = (wid++)%SIZE;
		return sticky[sid];
	}
	else {
		return (wid++)%SIZE;
	}
}

function sendEntry(cmd,entry,options,callback) {
	callback = callback || voidfn;
	options = options || {};

	var id = pid++;
	var wid = getId(options.sid);
	var w = workers[wid];
	pending[id] = {cb:callback,w:w};
	w.send({id:id,command:cmd,entry:entry,options:options});
}

function resolveEntry(message) {
	var id = message.id;
	var entry = message.entry;
	var error = message.error;

	var wcb = pending[id];
	delete pending[id];
	wcb.cb(error,entry);
}

function error(msg) {
	console.error(msg);
}

init();

module.exports = {
	CMD : CMD,
	configure(config) {cfg = config},
	parse(entry,options,callback){return sendEntry(CMD.parse,entry,options,callback)},
	process(entry,options,callback){return sendEntry(CMD.process,entry,options,callback)},
	transport(entry,options,callback){return sendEntry(CMD.transform,entry,options,callback)},
	SlaveStream(cmd,options) {
		var tr = new Transform({
			objectMode : true,
			transform(entry,encoding,callback) {
				sendEntry(cmd,entry,options,callback);
			}
		});
		tr.on("error",error);
		return tr;
	},
	MasterStream(cmd,instance) {
		var tr = new Transform({
			objectMode : true,
			transform(entry,encoding,callback) {
				instance[cmd](entry,callback);
			}
		});
		tr.on("error",error);
		return tr;
	}
}
