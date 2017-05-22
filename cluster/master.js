const cluster = require('cluster');
const os = require("os");
const SIZE = os.cpus().length;
const CMD = {
	parse : "parse",
	process : "process"
}

var workers = [];
var rr = 0;
var pending = {};
var cfg = {};

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

function sendEntry(cmd,entry,extra,callback) {
	callback = callback || voidfn;

	var id = rr++;
	var w = workers[id%SIZE];
	pending[id] = {cb:callback,w:w};
	w.send({id:id,command:cmd,entry:entry,extra:extra});
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
	configure : function(config) {cfg = config},
	parse : function(entry,extra,callback){return sendEntry(CMD.parse,entry,extra,callback)},
	process : function(entry,extra,callback){return sendEntry(CMD.process,entry,extra,callback)},
}
