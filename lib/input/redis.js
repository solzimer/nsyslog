const
	logger = require('../logger'),
	Input = require('./'),
	Redis = require('ioredis'),
	URL = require('url');

const FORMAT = {
	raw: "raw",
	json: "json"
};

const DEFAULTS = {
	url: "redis://localhost:6379", // Default Redis connection URL
	channels: "test", // Default channel to subscribe to
	format: "raw" // Default message format
};

/**
 * RedisInput class for consuming messages from Redis.
 * Extends the base Input class.
 */
class RedisInput extends Input {
	/**
	 * Constructor for RedisInput.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);
		this.paused = false; // Indicates whether the input is paused
	}

	/**
	 * Configures the RedisInput with the provided settings.
	 * 
	 * @param {Object} config - Configuration object containing:
	 * @param {string} [config.url="redis://localhost:6379"] - Redis connection URL.
	 * @param {string|Array<string>} [config.channels="test"] - Channel(s) to subscribe to.
	 * @param {string} [config.format="raw"] - Message format. Can be "raw" or "json".
	 * @param {Function} callback - Callback function to signal completion.
	 */
	configure(config, callback) {
		config = config || {};
		this.url = config.url || DEFAULTS.url;
		this.channels = config.channels || DEFAULTS.channels;
		this.format = FORMAT[config.format] || FORMAT.raw;

		if (!Array.isArray(this.channels))
			this.channels = [this.channels];

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
	 * Establishes a connection to the Redis server or cluster.
	 * 
	 * @returns {Promise<Object>} Resolves with the Redis client instance.
	 */
	connect() {
		let hosts = (Array.isArray(this.url) ? this.url : [this.url])
			.map(url => URL.parse(url))
			.map(url => `${url.hostname || 'localhost'}:${url.port || 6379}`);

		return new Promise((resolve, reject) => {
			let cluster = new Redis.Cluster(hosts);

			cluster.on("ready", () => {
				cluster.removeAllListeners("error");
				cluster.removeAllListeners("connected");
				resolve(cluster);
			});

			cluster.on("error", err => {
				logger.warn("Redis cluster not available");
				cluster.removeAllListeners("error");
				cluster.removeAllListeners("connected");
				cluster.disconnect();

				let client = new Redis(hosts[0].port, hosts[0].host);
				client.on("error", (err) => {
					logger.error("Redis connection not available");
					client.disconnect();
					client.removeAllListeners("error");
					client.removeAllListeners("ready");
					reject(err);
				});
				client.on("ready", () => {
					client.removeAllListeners("error");
					client.removeAllListeners("ready");
					resolve(client);
				});
			});
		});
	}

	/**
	 * Starts the RedisInput and subscribes to the specified channels.
	 * 
	 * @param {Function} callback - Callback function to process incoming messages.
	 */
	async start(callback) {
		logger.info('Start input on Redis endpoint', this.url);

		try {
			this.client = await this.connect();
			logger.info('Redis endpoint subscribed', this.channels);
		} catch (err) {
			return callback(err);
		}

		this.client.psubscribe(...this.channels, (err) => {
			if (err) callback(err);
			else {
				this.client.on('pmessage', (pattern, channel, message) => {
					if (this.paused) return;

					if (this.format == FORMAT.json) {
						try {
							message = JSON.parse(message);
						} catch (err) { }
					}
					callback(null, {
						id: this.id,
						type: 'redis',
						channel: channel,
						originalMessage: message
					});
				});
			}
		});
	}

	/**
	 * Stops the RedisInput and disconnects from the Redis server.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		if (this.client)
			this.client.disconnect();
		callback();
	}

	/**
	 * Pauses the RedisInput, preventing message processing.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		this.paused = true;
		callback();
	}

	/**
	 * Resumes the RedisInput, allowing message processing.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		this.paused = false;
		callback();
	}
}

module.exports = RedisInput;
