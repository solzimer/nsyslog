const
	cluster = require('cluster'),
	Transform = require('stream').Transform,
	os = require("os");

const CHANNEL = "nsyslog";
const SIZE = os.cpus().length;
const SEM = SIZE * 1000;
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
var sem = null;
var resolve = null;
var ready =  new Promise((res,rej)=>{resolve = res;});

function voidfn(){}

function init() {
	var j = 0;

	console.log('Master cluster setting up ' + SIZE + ' workers...');

	for(let i = 0; i < SIZE; i++) {
			workers.push(cluster.fork());
	}

	cluster.on('online',(worker) => {
			console.log('Worker ' + worker.process.pid + ' is online');
			worker.once('message',online=>{
				worker.on('message', resolveEntry);
				if(++j==SIZE) resolve();
			});
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
	w.send({channel:CHANNEL,id:id,command:cmd,entry:entry,options:options});
}

function resolveEntry(message) {
	if(message.channel!=CHANNEL) return;
	
	var id = message.id;
	var entry = message.entry;
	var error = message.error;

	var wcb = pending[id];
	if(wcb) {
		delete pending[id];
		wcb.cb(error,entry);
	}
}

function error(msg) {
	console.error("MASTER ERROR => ",msg);
}

init();

module.exports = {
	CMD : CMD,
	ready : ready,
	configure(config) {cfg = config},
	parse(entry,options,callback){return sendEntry(CMD.parse,entry,options,callback)},
	process(entry,options,callback){return sendEntry(CMD.process,entry,options,callback)},
	transport(entry,options,callback){return sendEntry(CMD.transform,entry,options,callback)},
	SlaveStream(cmd,options) {
		var tr = new Transform({
			objectMode : true,
			transform(entry,encoding,callback) {
				sendEntry(cmd,entry,options,(err,res)=>{
					if(err) {
						this.emit("strerr",err,options);
						callback(null,entry);
					}
					else {
						this.emit("strok",res,options);
						callback(null,res);
					}
				});
			}
		});
		tr.on("error",error);
		return tr;
	},
	MasterStream(cmd,instance,flow) {
		var tr = new Transform({
			objectMode : true,
			transform(entry,encoding,callback) {
				try {
					instance[cmd](entry,(err,res)=>{
						if(err) {
							this.emit("strerr",err,instance,flow);
							callback(null,entry);
						}
						else {
							this.emit("strok",res,instance,flow);
							callback(null,res);
						}
					});
				}catch(err) {
					this.emit("strerr",err,instance,flow);
					callback(null,entry);
				}
			}
		});
		tr.flow = flow;
		tr.instance = instance;
		tr.on("error",error);
		return tr;
	}
}
