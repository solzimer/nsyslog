const
	Input = require('./'),
	TLS = require('../tls'),
	extend = require('extend'),
	URL = require('url'),
	http = require('http'),
	https = require('https'),
	WebSocket = require('ws');

const FORMAT = {
	raw: "raw",
	json: "json"
};

/**
 * WebsocketInput class for handling WebSocket-based input.
 * Extends the base Input class.
 */
class WebsocketInput extends Input {
	/**
	 * Constructor for WebsocketInput.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the WebsocketInput with the provided settings.
	 * 
	 * @param {Object} config - Configuration object containing:
	 * @param {string} config.url - WebSocket URL to bind to.
	 * @param {string} [config.format="raw"] - Format of the input data. Can be "raw" or "json".
	 * @param {Object} [config.tls] - TLS configuration options.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	configure(config, callback) {
		config = config || {};
		this.config = config;
		this.format = FORMAT[config.format] || FORMAT.raw;
		this.url = config.url;
		this.options = extend({}, config.tls);
		callback();
	}

	/**
	 * Returns the mode of the input.
	 * @returns {string} The mode of the input (push).
	 */
	get mode() {
		return Input.MODE.push;
	}

	/**
	 * Starts the WebsocketInput and begins listening for WebSocket connections.
	 * 
	 * @param {Function} callback - Callback function to process incoming messages.
	 */
	async start(callback) {
		let url = URL.parse(this.url);
		let options = this.options;

		// Configure TLS if using secure WebSocket (wss)
		if (url.protocol.startsWith('wss')) {
			try {
				options = await TLS.configure(options, this.config.$path);
			} catch (err) {
				callback(err);
			}
			this.server = new https.createServer(options);
		} else {
			this.server = new http.createServer();
		}

		this.wss = new WebSocket.Server({ server: this.server });
		this.wss.on('connection', (ws) => {
			ws.on('message', (msg) => {
				this.send(msg, callback);
			});
		});

		this.server.listen(url.port, url.hostname, (err) => {
			if (err) callback(err);
		});
	}

	/**
	 * Processes a WebSocket message and sends it to the callback.
	 * 
	 * @param {string} msg - The message received from the WebSocket client.
	 * @param {Function} callback - Callback function to process the message.
	 */
	send(msg, callback) {
		if (this.paused) return;

		if (this.format == FORMAT.json) {
			try {
				msg = JSON.parse(msg);
			} catch (err) { }
		}
		let entry = { originalMessage: msg };
		callback(null, entry);
	}

	/**
	 * Stops the WebsocketInput and cleans up resources.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		callback();
	}

	/**
	 * Pauses the WebsocketInput, preventing further processing of messages.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		this.paused = true;
		callback();
	}

	/**
	 * Resumes the WebsocketInput, allowing processing of messages.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		this.paused = false;
		callback();
	}

	/**
	 * Generates a unique key for the input entry.
	 * 
	 * @param {Object} entry - Input entry object.
	 * @returns {string} Unique key for the entry.
	 */
	key(entry) {
		return `${entry.input}:${entry.type}@${this.url}`;
	}
}

module.exports = WebsocketInput;
