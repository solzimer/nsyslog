const
	logger = require('../logger'),
	extend = require('extend'),
	elastic = require('@elastic/elasticsearch'),
	Watermark = require('../watermark'),
	Queue = require('../queue'),
	TLS = require('../tls'),
	Input = require('./'),
	{timer} = require('../util'),
	jsexpr = require('jsexpr');

const { Client } = elastic;

// Default client options for Elasticsearch
const COPTS = {
	maxRetries: 5,
	requestTimeout: 60000,
	sniffOnStart: true
};

// Default configuration values for the ElasticInput
const DEFAULTS = {
	url: "http://localhost:9200",
	tls: TLS.DEFAULT,
	options: {},
};

/**
 * ElasticInput class for handling Elasticsearch-based input.
 * Extends the base Input class.
 */
class ElasticInput extends Input {
	/**
	 * Constructor for ElasticInput.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Returns the mode of the input.
	 * @returns {string} The mode of the input (pull).
	 */
	get mode() {
		return Input.MODE.pull;
	}

	/**
	 * Configures the ElasticInput with the provided settings.
	 * @param {Object} config - Configuration object.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config, callback) {
		// Merge default and provided configurations
		this.config = config = extend(true, {}, DEFAULTS, config);
		config.url = Array.isArray(config.url) ? config.url : [config.url];

		// Initialize configuration properties
		this.url = config.url;
		this.options = extend({}, config.options);
		this.istls = config.url.some(url => url.startsWith('https'));
		this.index = jsexpr.expr(config.index);
		this.query = jsexpr.expr(config.query || { match: {} });
		this.batchsize = config.batchsize || 100;
		this.ival = parseInt(config.interval) || null;
		this.queue = new Queue();
		this.sort = config.sort;
		this.watermark = new Watermark(config.$datadir);
		this.owm = config.watermark || {};

		// Configure TLS if HTTPS is used
		if (this.istls) {
			this.tls = await TLS.configure(config.tls, config.$path);
			this.options.agentOptions = this.tls;
		}

		// Initialize Elasticsearch client
		let copts = extend(true, COPTS, config.options, { node: config.url, auth: config.auth, ssl: this.tls });
		this.client = new Client(copts);

		// Initialize watermark
		await this.watermark.start();
		this.wm = await this.watermark.get(this.id);

		if (!this.wm[this.index]) {
			this.wm[this.index] = { last: this.owm };
		}

		await this.watermark.save(this.wm);

		this.reading = null;
		callback();
	}

	/**
	 * Fetches data from Elasticsearch and processes it.
	 * @returns {Promise<void>} Resolves when data is fetched and processed.
	 */
	async fetch() {
		if (this.reading) return this.reading;

		let wm = this.wm[this.index];
		let last = wm.last;
		let query = {
			index: this.index(last),
			size: this.batchsize,
			body: { query: this.query(last), sort: this.sort }
		};
		logger.silly(`${this.id} Elastic query`, this.url, query);

		this.reading = new Promise((ok, rej) => {
			this.client.search(query, async (err, res) => {
				if (err) return rej(err);
				let body = res.body;
				body.hits.hits.forEach(item => this.queue.push(item._source));
				let newm = body.hits.hits.pop();
				if (newm) wm.last = newm._source;
				return ok();
			});
		}).then(() => {
			this.reading = false;
			return this.watermark.save(this.wm);
		}).catch(err => {
			logger.error(err);
			this.reading = false;
			return this.watermark.save(this.wm);
		});

		return this.reading;
	}

	/**
	 * Starts the ElasticInput and begins fetching data.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async start(callback) {
		try {
			this.fetch();
			callback();
		} catch (err) {
			callback(err);
		}
	}

	/**
	 * Retrieves the next item from the queue.
	 * @param {Function} callback - Callback function to process the next item.
	 */
	async next(callback) {
		if (!this.queue.size()) {
			do {
				await this.fetch();
				if (!this.queue.size()) {
					await timer(500);
				}
			} while (!this.queue.size());
		}
		try {
			let item = await this.queue.pop(1000);
			if (item.err)
				callback(item.err);
			else
				callback(null, { index: this.index, originalMessage: item });
		} catch (err) {
			callback(err);
		}
	}

	/**
	 * Stops the ElasticInput and performs cleanup.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async stop(callback) {
		await this.watermark.save(this.wm);
		callback();
	}

	/**
	 * Pauses the ElasticInput by halting data fetching.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async pause(callback) {
		await this.watermark.save(this.wm);
		callback();
	}

	/**
	 * Resumes the ElasticInput by restarting data fetching.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		callback();
	}

	/**
	 * Generates a unique key for the input entry.
	 * @param {Object} entry - Input entry object.
	 * @returns {string} Unique key for the entry.
	 */
	key(entry) {
		return `${entry.input}:${entry.type}@${entry.url}`;
	}
}

module.exports = ElasticInput;
