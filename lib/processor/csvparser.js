const
	extend = require("extend"),
	Processor = require("./"),
	parse = require('csv-parse'),
	Semaphore = require("../semaphore"),
	logger = require("../logger"),
	jsexpr = require("jsexpr");

let wsupport = true;
try {require('worker_threads');}catch(err) {wsupport = false;}

if(wsupport) {
	var {Worker, isMainThread, parentPort, workerData} = require('worker_threads');
	if(isMainThread)
		logger.info('CSV parser: Multithread is enabled');
}
else {
	isMainThread = true;
	logger.warn('CSV parser: Multithread is disabled');
}

if(isMainThread) {
	class CSVParserProcessor extends Processor {
		constructor(id,type) {
			super(id,type);
			this.workers = [];
			this.seq = 0;
		}

		configure(config,callback) {
			this.config = extend({},config);
			this.output = jsexpr.assign(this.config.output || "csv");
			this.input = jsexpr.expr(this.config.input || "${originalMessage}");
			this.options = this.config.options || {};
			this.cores = parseInt(config.cores) || 0;
			this.multicore = wsupport && this.cores;

			if(this.multicore) {
				for(let i=0;i<this.cores;i++) {
					let worker = new Worker(__filename);
					worker.on("message",msg=>{
						let pr = worker.pr;
						this.output(pr.entry,msg.res);
						pr.callback(msg.err,pr.entry);
						pr.sem.leave();
					});
					worker.pr = {sem:new Semaphore(1), callback:null, entry:null};
					worker.postMessage(this.options);
					this.workers.push(worker);
				}
			}

			callback();
		}

		start(callback) {
			callback();
		}

		async process(entry,callback) {
			let msg = this.input(entry);

			if(!this.multicore) {
				parse(msg, this.options, (err,res)=>{
					res = (res || [])[0];
					this.output(entry,res);
					callback(err,entry);
				});
			}
			else {
				let id = this.seq++;
				let worker = this.workers[id%this.cores];
				await worker.pr.sem.take();
				worker.pr.callback = callback;
				worker.pr.entry = entry;
				worker.postMessage(msg);
			}
		}
	}

	module.exports = CSVParserProcessor;
}
else {
	var options = {};
	var first = true;

	function send(err,res) {
		res = (res || [])[0];
		parentPort.postMessage({err,res});
	}

	parentPort.on('message',msg=>{
		if(first) {
			options = msg;
			first = false;
		}
		else {
			parse(msg,options,send);
		}
	});
}
