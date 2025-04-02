const
	Processor = require("./"),
	TLS = require("../tls"),
	jsexpr = require("jsexpr"),
	extend = require("extend"),
	logger = require("../logger"),
	request = require('request');

const METHOD = {
	post: "post", put: "put", get: "get",
	POST: "post", PUT: "put", GET: "get"
};

const DEF_CONF = {
	url: "http://localhost:3000",
	method: "post",
	format: "${originalMessage}",
	headers: {
		'Content-Type': "application/json"
	},
	tls: TLS.DEFAULT
};

/**
 * HTTPProcessor class for sending log entries to an HTTP endpoint.
 * @extends Processor
 */
class HTTPProcessor extends Processor {
	/**
	 * Creates an instance of HTTPProcessor.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
		this.buffer = [];
		this.ival = null;
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {string} [config.url='http://localhost:3000'] - The HTTP endpoint URL.
	 * @param {string} [config.method='post'] - The HTTP method (e.g., post, get, put).
	 * @param {string} [config.format='${originalMessage}'] - Format for the HTTP response.
	 * @param {Object} [config.headers={'Content-Type': 'application/json'}] - HTTP headers.
	 * @param {Object} [config.tls={}] - TLS configuration for HTTPS requests.
	 * @param {Object} [config.options={}] - Additional request options.
	 * @param {Function} callback - The callback function.
	 */
	async configure(config, callback) {
		this.config = config = extend(true, {}, DEF_CONF, config);
		this.msg = jsexpr.expr(config.input || "${originalMessage}");
		this.format = jsexpr.expr(config.format || "${body}");
		this.url = jsexpr.expr(config.url);
		this.hmethod = METHOD[config.method] || METHOD.post;
		this.headers = jsexpr.expr(config.headers);
		this.tlsopts = config.tls;
		this.istls = config.url.startsWith('https');
		this.opts = jsexpr.expr(config.options || {});

		if (this.istls) {
			this.tlsopts = await TLS.configure(this.tlsopts, config.$path);
		}

		this.agentOptions = extend({}, this.istls ? this.tlsopts : {});

		callback();
	}

	/**
	 * Starts the processor.
	 * @param {Function} callback - The callback function.
	 */
	async start(callback) {
		callback();
	}

	/**
	 * Resumes the processor.
	 * @param {Function} callback - The callback function.
	 */
	resume(callback) {
		callback();
	}

	/**
	 * Pauses the processor.
	 * @param {Function} callback - The callback function.
	 */
	pause(callback) {
		callback();
	}

	/**
	 * Closes the processor.
	 * @param {Function} callback - The callback function.
	 */
	close(callback) {
		callback();
	}

	/**
	 * Generates a unique key for the log entry.
	 * @param {Object} entry - The log entry.
	 * @returns {string} The unique key.
	 */
	key(entry) {
		return `${entry.id}:${entry.type}`;
	}

	/**
	 * Processes a log entry and sends it to the HTTP endpoint.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function.
	 */
	async process(entry, callback) {
		let msg = this.msg(entry);
		let options = extend(true, {}, {
			method: this.hmethod,
			url: this.url(entry),
			headers: this.headers(entry),
			agentOptions: this.agentOptions,
			body: typeof (msg) == 'string' ? msg : JSON.stringify(msg)
		}, this.opts(entry));

		request[this.hmethod](options, (err, res, body) => {
			let data = this.format({ err, res, body });
			extend(true, entry, data);
			callback(null, entry);
		});
	}
}

module.exports = HTTPProcessor;
