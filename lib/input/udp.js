const
	logger = require('../logger'),
	Input = require('./'),
	dgram = require('dgram');

const DEFAULTS = {
	host: "0.0.0.0", // Default host address
	port: 514, // Default port
	protocol: "udp4" // Default protocol
};

/**
 * UDPServer class for handling UDP-based input.
 * Extends the base Input class.
 */
class UDPServer extends Input {
	/**
	 * Constructor for UDPServer.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the UDPServer with the provided settings.
	 * 
	 * @param {Object} config - Configuration object containing:
	 * @param {string} [config.host="0.0.0.0"] - Host address to bind to.
	 * @param {number} [config.port=514] - Port to listen on.
	 * @param {string} [config.protocol="udp4"] - Protocol to use (e.g., "udp4").
	 * @param {Function} callback - Callback function to signal completion.
	 */
	configure(config, callback) {
		config = config || {};
		this.host = config.host || DEFAULTS.host;
		this.port = config.port || DEFAULTS.port;
		this.protocol = config.protocol || DEFAULTS.protocol;
		this.server = null;
		this.paused = false;
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
	 * Starts the UDPServer and begins listening for incoming messages.
	 * 
	 * @param {Function} callback - Callback function to process incoming messages.
	 */
	start(callback) {
		this.server = dgram.createSocket(this.protocol);
		var eserver = {protocol: this.protocol, port: this.port, interface: this.host};

		this.server.on('listening', () => {
			logger.debug(`UDP server listening on ${this.server.address()}`);
		});

		this.server.on('message', (message, remote) => {
			if (this.paused) return;
			var entry = {
				originalMessage: message.toString(),
				server: eserver,
				client: {address: remote.address}
			};
			callback(null, entry);
		});

		this.server.on("error", err => {
			logger.error(err);
			this.server.close();
			callback(err, null);
		});

		this.server.bind(this.port, this.host);
	}

	/**
	 * Stops the UDPServer and cleans up resources.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		this.server.close(callback);
	}

	/**
	 * Pauses the UDPServer, preventing further processing of incoming messages.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		this.paused = true;
		callback();
	}

	/**
	 * Resumes the UDPServer, allowing processing of incoming messages.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		this.paused = false;
		callback();
	}
}

module.exports = UDPServer;
