const
	logger = require('../logger'),
	extend = require('extend'),
	request = require('request'),
	Watermark = require('../watermark'),
	Queue = require('../queue'),
	jsexpr = require('jsexpr'),
	{timer, immediate} = require('../util'),
	TLS = require('../tls'),
	Input = require('.'),
	URL = require('url');

const DEFAULTS = {
	start: 'start',
	url: 'http://localhost',
	options: {},
	tls: {
		rejectUnauthorized: false
	},
	states: {
		start: {
			url: "http://localhost",
			options: {},
			emit: [
				{ when: 'true', then: "${body}", next: 'start' }
			]
		}
	}
};

const PROTOS = {
	"http:": true,
	"https:": true
};

/**
 * HTTPSMInput class for handling HTTP state machine-based input.
 * Extends the base Input class.
 */
class HTTPSMInput extends Input {
	/**
	 * Constructor for HTTPSMInput.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);
		this.timeout = 0; // Timeout for the next state transition
	}

	/**
	 * Returns the mode of the input.
	 * @returns {string} The mode of the input (pull).
	 */
	get mode() {
		return Input.MODE.pull;
	}

	/**
	 * Configures the HTTPSMInput with the provided settings.
	 * 
	 * This method initializes the input by merging the provided configuration
	 * with the default settings. It sets up the state machine, prepares the
	 * watermark for tracking state, and evaluates the starting state. Each state
	 * is configured with its respective options, TLS settings, and emit conditions.
	 * 
	 * @param {Object} config - Configuration object containing:
	 * @param {string} [config.start="start"] - The initial state to start the state machine.
	 * @param {Object} [config.states] - An object defining the states of the state machine. Each state includes:
	 * @param {string} [config.states.url] - The endpoint URL to fetch data from.
	 * @param {Object} [config.states.options] - HTTP request options, such as method, headers, and body.
	 * @param {Array<Object>} [config.states.emit] - An array of conditions and actions to perform based on the response.
	 * @param {string} [config.states.emit.when="true"] - A condition to evaluate for the response.
	 * @param {string} [config.states.emit.next] - The next state to transition to.
	 * @param {number} [config.states.emit.timeout=-1] - Timeout in milliseconds before the next fetch.
	 * @param {Function} [config.states.emit.store] - A function to store data for use in subsequent states.
	 * @param {Function} [config.states.emit.publish] - A function to publish data as the output of the input.
	 * @param {Object} [config.states.emit.log] - Logging configuration for the state transition.
	 * @param {string} [config.states.emit.log.level="info"] - Log level (e.g., "info", "error").
	 * @param {string} [config.states.emit.log.message=""] - Log message template.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config, callback) {
		this.config = config = extend(true, {}, DEFAULTS, config);
		this.queue = new Queue();
		this.watermark = new Watermark(config.$datadir);
		this.owm = config.watermark || {};
		this.xpstart = jsexpr.expr(this.config.start || "start");

		// Configure states
		let prall = Object.keys(this.config.states).map(async (key) => {
			let state = this.config.states[key];
			state.name = key;
			state.options = extend(true, {}, this.config.options, state.options);
			state.tls = extend(true, {}, this.config.tls, state.tls);
			let tls = state.tls;
			if (tls) this.tls = await TLS.configure(tls, config.$path);
			state.url = jsexpr.expr(state.options.url || state.url || 'http://localhost');
			state.options = jsexpr.expr(state.options);
			state.method = jsexpr.expr(state.method || 'GET');
			state.options.agentOptions = tls ? state.tls : {};
			state.emit = state.emit || [];
			state.emit.forEach(emit => {
				emit.when = jsexpr.eval(emit.when || 'true');
				emit.publish = emit.publish ? jsexpr.expr(emit.publish) : null;
				emit.next = jsexpr.expr(emit.next || state.name);
				emit.store = emit.store ? jsexpr.expr(emit.store) : () => { };
				emit.timeout = jsexpr.eval(`${emit.timeout || '-1'}`);
				if (emit.log) {
					emit.log.level = jsexpr.expr(emit.log.level || 'info');
					emit.log.message = jsexpr.expr(emit.log.message || "");
				}
			});
		});

		await Promise.all(prall);
		await this.watermark.start();
		this.wm = await this.watermark.get(this.id);

		if (!this.wm.last) {
			this.wm.last = this.owm;
		}
		if (!this.wm.store) {
			this.wm.store = {};
		}

		await this.watermark.save(this.wm);

		this.state = this.config.states[this.xpstart(this.wm.store)];

		callback();
	}

	/**
	 * Fetches data from the current state and processes it.
	 * @returns {Promise<Object|null>} Resolves with the fetched data or null.
	 */
	async fetch() {
		if (this.state.debug) debugger;

		let wm = this.wm;
		let last = wm.last;
		let store = wm.store;

		let state = this.state;
		let options = state.options(store);
		let url = state.url(store);
		let method = state.method(store);

		options.url = options.url || url || 'http://localhost';
		options.method = options.method || method || 'GET';

		logger.silly(`${this.id} http query`, url, options);

		let result = await new Promise(ok => {
			request(options, (error, res, body) => {
				ok({ error, res, body });
			});
		});

		if (result.error) {
			throw result.error;
		}

		if (result.body) {
			let headers = result.res.headers;
			if (headers['content-type'] && headers['content-type'].indexOf('application/json') >= 0) {
				if (typeof (result.body) == 'string') {
					try {
						result.body = JSON.parse(result.body);
					} catch (ignore) { }
				}
			}
		}
		let emit = state.emit.find(emit => {
			if (emit.when(result)) return true;
		});

		let msg = {
			headers: result.res.headers,
			httpVersion: result.res.httpVersion,
			url: url,
			statusCode: result.res.statusCode,
			originalMessage: emit && emit.publish ? emit.publish(result) : result.body
		};

		wm.last = msg;
		if (emit) {
			wm.store = extend(true, wm.store, emit.store(result));
		}
		await this.watermark.save(wm);

		// If "then" clause, publish message, otherwise only change state
		return emit ? { entry: emit.publish ? msg : null, emit, result } : null;
	}

	/**
	 * Starts the HTTPSMInput and initializes the state machine.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	start(callback) {
		this.timeout = 0;
		callback();
	}

	/**
	 * Retrieves the next item from the state machine.
	 * @param {Function} callback - Callback function to process the next item.
	 */
	async next(callback) {
		let entry, emit, result;

		do {
			// Wait timeout or wait forever if end state
			if (this.timeout >= 0) {
				await timer(this.timeout);
			} else {
				await new Promise(ok => { });
			}

			try {
				// Fetch HTTP data
				({ entry, emit, result } = await this.fetch());

				// Entry matches an emit clause
				if (emit) {
					this.state = this.config.states[emit.next(result)] || this.state;
					this.timeout = emit.timeout(entry);
					if (emit.log) {
						logger[emit.log.level(result)](`${this.id} ${emit.log.message(result)}`);
					}
					logger.silly(`${this.id} Next query in ${this.timeout} ms`);
				}

				// If entry, publish
				if (entry) {
					callback(null, entry);
				}

			} catch (err) {
				logger.error(`${this.id} `, err);
				return callback(err);
			}

		} while (!entry);
	}

	/**
	 * Stops the HTTPSMInput and performs cleanup.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		callback();
	}

	/**
	 * Pauses the HTTPSMInput by halting state transitions.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		this.stop(callback);
	}

	/**
	 * Resumes the HTTPSMInput by restarting state transitions.
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

module.exports = HTTPSMInput;
