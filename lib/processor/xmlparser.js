const
	extend = require("extend"),
	Processor = require("./"),
	xml = require('xml2js').parseString,
	Semaphore = require("../semaphore"),
	logger = require("../logger"),
	jsexpr = require("jsexpr");

let wsupport = true;
try { require('worker_threads'); } catch (err) { wsupport = false; }

if (wsupport) {
	var { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
	if (isMainThread)
		logger.info('XML parser: Multithread is enabled');
} else {
	isMainThread = true;
	logger.warn('XML parser: Multithread is disabled');
}

const XML_OPTS = {
	explicitArray: false,
	mergeAttrs: true
};

/**
 * XMLParserProcessor class extends Processor to parse XML messages into JSON objects.
 * It supports both single-threaded and multi-threaded processing.
 */
class XMLParserProcessor extends Processor {
	/**
	 * Constructs a new XMLParserProcessor instance.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
		this.workers = [];
		this.seq = 0;
		this.xmlstr = "";
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {string} [config.input="${originalMessage}"] - The input expression to extract the XML message.
	 * @param {string} [config.output="splitted"] - The output field to store the parsed JSON object.
	 * @param {string} [config.tag=null] - The XML tag to match for parsing.
	 * @param {boolean} [config.multiline=false] - Whether to process multiline XML messages.
	 * @param {number} [config.cores=0] - The number of cores to use for multi-threaded processing.
	 * @param {Function} callback - The callback function to be called after configuration.
	 */
	configure(config, callback) {
		this.config = extend({}, config);
		this.output = jsexpr.assign(this.config.output || "splitted");
		this.input = jsexpr.expr(this.config.input || "${originalMessage}");
		this.tag = this.config.tag || null;
		this.multiline = this.config.multiline || false;
		this.cores = parseInt(config.cores) || 0;
		this.multicore = wsupport && this.cores && !this.multiline;

		if (this.tag != null) {
			this.rx = new RegExp(`<${this.tag}[ >]((?!<\/${this.tag}>).)*<\/${this.tag}>`, 'gm');
		} else {
			this.rx = /(.*)/m;
		}

		if (this.multicore) {
			for (let i = 0; i < this.cores; i++) {
				let worker = new Worker(__filename);
				worker.on("message", msg => {
					let pr = worker.pr;
					this.output(pr.entry, msg.res);
					pr.callback(msg.err, pr.entry);
					pr.sem.leave();
				});
				worker.pr = { sem: new Semaphore(1), callback: null, entry: null };
				worker.postMessage({ tag: this.tag });
				this.workers.push(worker);
			}
		}

		callback();
	}

	/**
	 * Starts the processor (no-op for this processor).
	 * @param {Function} callback - The callback function to be called after starting.
	 */
	start(callback) {
		callback();
	}

	/**
	 * Parses XML matches and assigns the result to the output field.
	 * @param {Object} entry - The log entry to process.
	 * @param {Array} matches - The matched XML strings.
	 * @param {Function} callback - The callback function to be called after parsing.
	 */
	async parse(entry, matches, callback) {
		try {
			let all = await Promise.all(matches.map(str => new Promise((ok, rej) => {
				xml(str, XML_OPTS, (err, json) => err ? rej(err) : ok(json));
			})));
			this.output(entry, all);
			callback(null, entry);
		} catch (err) {
			callback(err, entry);
		}
	}

	/**
	 * Processes a log entry by parsing XML messages.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function to be called after processing.
	 */
	async process(entry, callback) {
		let msg = this.input(entry);

		if (!this.multicore) {
			if (this.multiline) {
				this.xmlstr += msg;
				let matches = this.xmlstr.match(this.rx);
				if (!matches) callback();
				else {
					this.xmlstr = "";
					this.parse(entry, matches, callback);
				}
			} else {
				let matches = msg.match(this.rx);
				if (!matches) callback();
				else this.parse(entry, matches, callback);
			}
		} else {
			let id = this.seq++;
			let worker = this.workers[id % this.cores];
			await worker.pr.sem.take();
			worker.pr.callback = callback;
			worker.pr.entry = entry;
			worker.postMessage(msg);
		}
	}
}

if(isMainThread) {
	module.exports = XMLParserProcessor;
}
else {
	var first = true;
	var rx = /.*/;

	function send(err, res) {
		res = (res || [])[0];
		parentPort.postMessage({ err, res });
	}

	parentPort.on('message', async msg => {
		if (first) {
			if (msg.tag)
				rx = new RegExp(`<${msg.tag}[ >]((?!<\/${msg.tag}>).)*<\/${msg.tag}>`, 'gm');
			first = false;
		} else {
			let matches = msg.match(rx);
			if (!matches) parentPort.postMessage({ err: null, res: null });
			else {
				try {
					let res = await Promise.all(matches.map(parse));
					parentPort.postMessage({ res });
				} catch (err) {
					parentPort.postMessage({ err });
				}
			}
		}
	});
}
