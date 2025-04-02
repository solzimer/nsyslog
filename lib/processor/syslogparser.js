const
	Processor = require("./"),
	jsexpr = require("jsexpr"),
	Semaphore = require("../semaphore"),
	logger = require("../logger"),
	parser = require("nsyslog-parser");

let wsupport = true;
try {
	require('worker_threads');
} catch (err) {
	wsupport = false;
}

if (wsupport) {
	var { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
	if (isMainThread)
		logger.info('Syslog parser: Multithread is enabled');
} else {
	isMainThread = true;
	logger.warn('Syslog parser: Multithread is disabled');
}

if (isMainThread) {
	/**
	 * SyslogParserProcessor class extends Processor to parse syslog messages.
	 * It supports both single-threaded and multi-threaded processing.
	 */
	class SyslogParserProcessor extends Processor {
		/**
		 * Constructs a new SyslogParserProcessor instance.
		 * @param {string} id - The processor ID.
		 * @param {string} type - The processor type.
		 */
		constructor(id, type) {
			super(id, type);
			this.workers = []; // Array to store worker threads
			this.seq = 0; // Sequence number for assigning workers
		}

		/**
		 * Configures the processor with the given configuration.
		 * @param {Object} config - The configuration object.
		 * @param {string} [config.field="${originalMessage}"] - The input field to parse.
		 * @param {number} [config.cores=0] - The number of cores to use for multi-threaded processing.
		 * @param {Function} callback - The callback function to be called after configuration.
		 */
		configure(config, callback) {
			this.field = jsexpr.expr(config.field || config.input || "${originalMessage}");
			this.cores = parseInt(config.cores) || 0;
			this.multicore = wsupport && this.cores;

			// Initialize worker threads if multi-threading is enabled
			if (this.multicore) {
				for (let i = 0; i < this.cores; i++) {
					let worker = new Worker(__filename);
					worker.on("message", msg => {
						let pr = worker.pr;
						pr.entry.syslog = msg; // Assign parsed syslog data to the entry
						pr.callback(null, pr.entry); // Call the callback with the processed entry
						pr.sem.leave(); // Release the semaphore
					});
					worker.pr = { sem: new Semaphore(1), callback: null, entry: null };
					this.workers.push(worker);
				}
			}

			callback();
		}

		/**
		 * Processes a log entry by parsing the syslog message.
		 * @param {Object} entry - The log entry to process.
		 * @param {Function} callback - The callback function to be called after processing.
		 */
		async process(entry, callback) {
			let line = this.field(entry); // Extract the input field

			// Single-threaded processing
			if (!this.multicore) {
				entry.syslog = parser(line); // Parse the syslog message
				callback(null, entry); // Call the callback with the processed entry
			} else {
				// Multi-threaded processing
				let id = this.seq++;
				let worker = this.workers[id % this.cores];
				await worker.pr.sem.take(); // Acquire the semaphore
				worker.pr.callback = callback;
				worker.pr.entry = entry;
				worker.postMessage(line); // Send the syslog message to the worker
			}
		}
	}

	module.exports = SyslogParserProcessor;
} else {
	// Worker thread logic for parsing syslog messages
	parentPort.on('message', msg => {
		try {
			let res = parser(msg); // Parse the syslog message
			parentPort.postMessage(res); // Send the parsed result back to the main thread
		} catch (err) {
			parentPort.postMessage(null); // Send null in case of an error
		}
	});
}
