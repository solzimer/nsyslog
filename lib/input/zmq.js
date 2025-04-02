const
	logger = require('../logger'),
	Input = require('./'),
	zmq = require('zeromq'),
	pullSocket = zmq.socket('pull'),
	subSocket = zmq.socket('sub');

const FORMAT = {
	raw: "raw",
	json: "json"
};

const DEFAULTS = {
	url: "tcp://localhost:6666", // Default ZeroMQ connection URL
	mode: "pull", // Default mode
	channel: "_test_", // Default channel for subscription
	format: "raw" // Default message format
};

const MODES = {
	pull: "pull",
	sub: "sub"
};

/**
 * ZMQInput class for handling ZeroMQ-based input.
 * Extends the base Input class.
 */
class ZMQInput extends Input {
	/**
	 * Constructor for ZMQInput.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the ZMQInput with the provided settings.
	 * 
	 * @param {Object} config - Configuration object containing:
	 * @param {string} [config.url="tcp://localhost:6666"] - ZeroMQ connection URL.
	 * @param {string} [config.mode="pull"] - Mode of operation. Can be "pull" or "sub".
	 * @param {string} [config.channel="_test_"] - Channel to subscribe to (for "sub" mode).
	 * @param {string} [config.format="raw"] - Message format. Can be "raw" or "json".
	 * @param {Function} callback - Callback function to signal completion.
	 */
	configure(config, callback) {
		config = config || {};
		this.url = config.url || DEFAULTS.url;
		this.zmode = MODES[config.mode] || DEFAULTS.mode;
		this.channel = config.channel || DEFAULTS.channel;
		this.format = FORMAT[config.format] || FORMAT.raw;
		this.sock = null;
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
	 * Starts the ZMQInput and connects to the ZeroMQ socket.
	 * 
	 * @param {Function} callback - Callback function to process incoming messages.
	 */
	start(callback) {
		switch (this.zmode) {
			case MODES.sub:
				this.sock = subSocket;
				this.sock.connect(this.url);
				this.sock.subscribe(this.channel);
				this.sock.on('message', (topic, message) => this.send(topic, message, callback));
				logger.info(`ZeroMQ Subscriber connected to ${this.url} => ${this.channel}`);
				break;
			case MODES.pull:
			default:
				this.sock = pullSocket;
				this.sock.connect(this.url);
				this.sock.on('message', (message) => this.send(null, message, callback));
				logger.info(`ZeroMQ Puller connected to ${this.url}`);
				break;
		}
	}

	/**
	 * Processes a ZeroMQ message and sends it to the callback.
	 * 
	 * @param {Buffer|null} topic - The topic of the message (for "sub" mode).
	 * @param {Buffer} msg - The message received from ZeroMQ.
	 * @param {Function} callback - Callback function to process the message.
	 */
	send(topic, msg, callback) {
		if (this.paused) return;

		msg = msg.toString();
		if (this.format == FORMAT.json) {
			try {
				msg = JSON.parse(msg);
			} catch (err) { }
		}
		let entry = {
			mode: this.zmode,
			url: this.url,
			originalMessage: msg,
		};
		if (topic) entry.topic = `${topic}`;
		callback(null, entry);
	}

	/**
	 * Stops the ZMQInput and disconnects from the ZeroMQ socket.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		if (this.sock)
			this.sock.disconnect(this.url);
		callback();
	}

	/**
	 * Pauses the ZMQInput, preventing message processing.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		this.paused = true;
		callback();
	}

	/**
	 * Resumes the ZMQInput, allowing message processing.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		this.paused = false;
		callback();
	}
}

module.exports = ZMQInput;
