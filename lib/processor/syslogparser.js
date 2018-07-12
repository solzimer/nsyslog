const
	Processor = require("./"),
	jsexpr = require("jsexpr"),
	parser = require("nsyslog-parser");

let wsupport = true;
try {require('worker_threads');}catch(err) {wsupport = false;}

if(wsupport) {
	var {Worker, isMainThread, parentPort, workerData} = require('worker_threads');
}
else {
	isMainThread = true;
}

if(isMainThread) {
	class SyslogParserProcessor extends Processor {
		constructor(id) {
			super(id);
			this.map = {};
			this.cores = [];
			this.seq = 0;
			this.ival = null;
		}

		configure(config, callback) {
			this.field = jsexpr.expr(config.field || "${originalMessage}");
			this.cores = parseInt(config.cores) || 0;
			this.multicore = wsupport && this.cores;

			if(this.multicore) {
				for(let i=0;i<this.cores;i++) {
					let worker = new Worker(__filename);
					worker.on("message",msg=>{
						let cb = this.map[msg.id];
						delete this.map[msg.id];
						cb.entry.syslog = msg.entry;
						cb.callback(cb.entry);
					});
					this.cores.push(worker);
				}
			}

			callback();
		}

		process(entry,callback) {
			if(!this.multicore) {
				let line = this.field(entry);
				entry.syslog = parser(line);
				callback(null,entry);
			}
			else {
				let id = this.seq++;
				let worker = this.workers[id%this.cores];
				this.map[id] = {entry,callback};
				worker.postMessage({id,line});
			}
		}
	}

	module.exports = SyslogParserProcessor;
}
else {
	parentPort.on('message',msg=>{
		let res = parse(msg.entry);
		parentPort.postMessage({id:msg.id,entry:res});
	});
}
