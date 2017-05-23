const cluster = require('cluster');
const Transform = require('stream').Transform;
const os = require("os");
const SIZE = os.cpus().length;
const CMD = {
	parse : "parse",
	process : "process"
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

	var wcb = pending[id];
	delete pending[id];
	wcb.cb(entry);
}

init();

module.exports = {
	CMD : CMD,
	configure : function(config) {cfg = config},
	parse : function(entry,options,callback){return sendEntry(CMD.parse,entry,options,callback)},
	process : function(entry,options,callback){return sendEntry(CMD.process,entry,options,callback)},
	Stream : function(cmd,options) {
		return new Transform({
			objectMode : true,
			transform(entry,encoding,callback) {
				sendEntry(cmd,entry,options,res=>{
					callback(null,res);
				});
			}
		});
	}
}
