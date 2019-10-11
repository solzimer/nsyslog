const
	Processor = require("./"),
	jsexpr = require("jsexpr"),
	Semaphore = require("../semaphore"),
	logger = require("../logger"),
	parser = require("nsyslog-parser");

let wsupport = true;
try {require('worker_threads');}catch(err) {wsupport = false;}

if(wsupport) {
	var {Worker, isMainThread, parentPort, workerData} = require('worker_threads');
	if(isMainThread)
		logger.info('Syslog parser: Multithread is enabled');
}
else {
	isMainThread = true;
	logger.warn('Syslog parser: Multithread is disabled');
}

if(isMainThread) {
	class SyslogParserProcessor extends Processor {
		constructor(id,type) {
			super(id,type);
			this.workers = [];
			this.seq = 0;
		}

		configure(config, callback) {
			this.field = jsexpr.expr(config.field || config.input || "${originalMessage}");
			this.cores = parseInt(config.cores) || 0;
			this.multicore = wsupport && this.cores;

			if(this.multicore) {
				for(let i=0;i<this.cores;i++) {
					let worker = new Worker(__filename);
					worker.on("message",msg=>{
						let pr = worker.pr;
						pr.entry.syslog = msg;
						pr.callback(null,pr.entry);
						pr.sem.leave();
					});
					worker.pr = {sem:new Semaphore(1), callback:null, entry:null};
					this.workers.push(worker);
				}
			}

			callback();
		}

		async process(entry,callback) {
			let line = this.field(entry);

			if(!this.multicore) {
				entry.syslog = parser(line);
				callback(null,entry);
			}
			else {
				let id = this.seq++;
				let worker = this.workers[id%this.cores];
				await worker.pr.sem.take();
				worker.pr.callback = callback;
				worker.pr.entry = entry;
				worker.postMessage(line);
			}
		}
	}

	module.exports = SyslogParserProcessor;
}
else {
	parentPort.on('message',msg=>{
		try {
			let res = parser(msg);
			parentPort.postMessage(res);
		}catch(err) {
			parentPort.postMessage(null);
		}
	});
}
