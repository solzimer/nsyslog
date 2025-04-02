const
	extend = require("extend"),
	Processor = require("./"),
	parse = require('csv-parse'),
	Semaphore = require("../semaphore"),
	logger = require("../logger"),
	{Transform} = require('stream'),
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
	/**
	 * CSVParserProcessor class for parsing CSV data from log entries.
	 * @extends Processor
	 */
	class CSVParserProcessor extends Processor {
		/**
		 * Creates an instance of CSVParserProcessor.
		 * @param {string} id - The processor ID.
		 * @param {string} type - The processor type.
		 */
		constructor(id,type) {
			super(id,type);
			this.workers = [];
			this.seq = 0;
		}

		/**
		 * Configures the processor with the given configuration.
		 * @param {Object} config - The configuration object.
		 * @param {string} [config.input='${originalMessage}'] - The input field containing CSV data.
		 * @param {string} [config.output='csv'] - The output field to store parsed CSV data.
		 * @param {Object} [config.options={}] - Options for the CSV parser (e.g., delimiter, columns).
		 * @param {number} [config.cores=0] - Number of cores to use for multithreading (if supported).
		 * @param {Function} callback - The callback function.
		 */
		configure(config,callback) {
			this.config = extend({},config);
			this.output = jsexpr.assign(this.config.output || "csv");
			this.input = jsexpr.expr(this.config.input || "${originalMessage}");
			this.options = this.config.options || {};
			this.cores = parseInt(config.cores) || 0;
			this.multicore = wsupport && this.cores;
			this.callbacks = [];

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
			else {
				this.parser = parse(this.options);
			}

			callback();
		}

		/**
		 * Starts the processor.
		 * @param {Function} callback - The callback function.
		 */
		start(callback) {
			if(!this.multicore) {
				this.first = this.options.columns;
				let callbacks = this.callbacks;
				let output = this.output;
				let tr = new Transform({
					objectMode : true,
  				transform(chunk, _encoding, callback) {
						let acker = callbacks.shift();
						output(acker.entry,chunk);
						acker.callback(null,acker.entry);
						callback();
  				}
				});

				this.parser.pipe(tr);
				this.parser.on('error',(err)=>{
					let acker = this.callbacks.pop();
					acker.callback(err,acker.entry);
				});
			}

			callback();
		}

		/**
		 * Processes a log entry and parses its CSV data.
		 * @param {Object} entry - The log entry to process.
		 * @param {Function} callback - The callback function.
		 */
		async process(entry,callback) {
			let msg = this.input(entry);

			if(!this.multicore) {
				if(this.first) {
					this.first = false;
					this.parser.write(`${msg}\n`);
					this.output(entry,{});
					callback(null,entry);
				}
				else {
					this.callbacks.push({callback,entry,msg});
					this.parser.write(`${msg}\n`);
				}
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
