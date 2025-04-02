const
	logger = require('../logger'),
	extend = require('extend'),
	request = require('request'),
	Watermark = require('../watermark'),
	Queue = require('../queue'),
	jsexpr = require('jsexpr'),
	{timer,immediate} = require('../util'),
	TLS = require('../tls'),
	Input = require('./'),
	URL = require('url');

const DEFAULTS = {
	url : "http://localhost",
	options : {},
	tls : {
		rejectUnauthorized : false
	}
};

/**
 * HTTPInput class for handling HTTP-based input.
 * Extends the base Input class.
 */
class HTTPInput extends Input {
	/**
	 * Constructor for HTTPInput.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Returns the mode of the input.
	 * @returns {string} The mode of the input (push or pull).
	 */
	get mode() {
		return this.ival ? Input.MODE.push : Input.MODE.pull;
	}

	/**
	 * Configures the HTTPInput with the provided settings.
	 * @param {Object} config - Configuration object.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config, callback) {
		// Merge default and provided configurations
		this.config = config = extend(true, {}, DEFAULTS, config);

		let url = URL.parse(config.url || 'false');
		let options = config.options;
		let tls = config.tls;

		// Validate URL protocol
		switch (url.protocol) {
			case 'http:':
			case 'https:':
				break;
			default:
				return callback(new Error(`Unknown protocol ${url.protocol}`));
		}

		// Configure TLS if provided
		if (tls) this.tls = await TLS.configure(tls, config.$path);

		// Initialize configuration properties
		this.url = jsexpr.expr(config.url || 'http://localhost');
		this.options = jsexpr.expr(options);
		this.method = jsexpr.expr(config.method || 'GET');
		this.ival = typeof config.interval === 'string' ? jsexpr.eval(config.interval) : (parseInt(config.interval) || null);
		this.retry = typeof config.retry === 'string' ? jsexpr.eval(config.retry) : (parseInt(config.retry) || null);
		this.options.agentOptions = tls ? this.tls : {};
		this.queue = new Queue();
		this.watermark = new Watermark(config.$datadir);
		this.owm = config.watermark || {};

		// Initialize watermark
		await this.watermark.start();
		this.wm = await this.watermark.get(this.id);

		if (!this.wm.last) {
			this.wm.last = this.owm;
		}

		await this.watermark.save(this.wm);

		this.reading = null;
		callback();
	}

	/**
	 * Fetches data from the HTTP endpoint and processes it.
	 * @returns {Promise<void>} Resolves when data is fetched and processed.
	 */
	fetch() {
		if (this.reading) return this.reading;

		let wm = this.wm;
		let last = wm.last;
		let options = this.options(last);
		let url = this.url(last);
		let method = this.method(last);

		options.url = options.url || url || 'http://localhost';
		options.method = options.method || method || 'GET';

		logger.silly(`${this.id} http query`, url, options);

		this.reading = new Promise((ok, rej) => {
			request(options, (error, res, body) => {
				if (error) return rej(error);
				else if (res.statusCode != 200) return rej(body);
				else {
					let ctype = res.headers['content-type'];
					if (ctype && ctype.toLowerCase().startsWith('application/json')) {
						try { body = JSON.parse(body); } catch (ex) { logger.warn(`${this.id}`, ex); }
					}
					if (!Array.isArray(body)) body = [body];
					body.forEach(b => {
						wm.last = b;
						this.queue.push({
							headers: res.headers,
							httpVersion: res.httpVersion,
							url: this.url.href,
							statusCode: res.statusCode,
							originalMessage: b
						});
					});

					return ok();
				}
			});
		}).then(async (res) => {
			await this.watermark.save(this.wm);
			this.reading = false;
			return res;
		}).catch((err) => {
			logger.error(err);
			this.reading = false;
			throw err;
		});

		return this.reading;
	}

	/**
	 * Starts the HTTPInput and begins fetching data.
	 * @param {Function} callback - Callback function to process fetched data.
	 */
	start(callback) {
		if (this.ival) {
			var fnloop = async () => {
				let isError = false;

				try {
					await this.fetch();
					while (this.queue.size()) {
						await immediate();
						callback(null, await this.queue.pop());
					}
					isError = false;
				} catch (err) {
					logger.error(`${this.id} Error fetching data`, err);
					isError = true;
				}

				// Schedule the next HTTP query
				let wm = this.wm;
				let last = wm.last;
				let xprival = isError ? this.retry : this.ival;
				if (xprival) {
					let ival = typeof xprival === 'number' ? xprival : xprival(last);
					logger.silly(`${this.id} next http query in ${ival} ms`);
					this.timer = setTimeout(() => fnloop(), ival);
				} else {
					logger.info(`${this.id} No defined interval for http query / retry`);
				}
			};
			fnloop();
		} else {
			callback();
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
			callback(null, item);
		} catch (err) {
			callback(err);
		}
	}

	/**
	 * Stops the HTTPInput and performs cleanup.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		if (this.timer) {
			clearInterval(this.timer);
		}
		callback();
	}

	/**
	 * Pauses the HTTPInput by halting data fetching.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		this.stop(callback);
	}

	/**
	 * Resumes the HTTPInput by restarting data fetching.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		this.start(callback);
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

module.exports = HTTPInput;
