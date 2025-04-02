/**
 * StatTransporter is a transporter that logs the number of messages received
 * after a specified threshold.
 */
const logger = require("../logger"),
	Transporter = require('./');

class StatTransporter extends Transporter {
	/**
	 * Constructs a StatTransporter instance.
	 * @param {string} id - The identifier for the transporter.
	 * @param {string} type - The type of the transporter.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the StatTransporter with the provided settings.
	 * @param {Object} config - Configuration object.
	 * @param {number} [config.threshold=1000] - The message count threshold for logging.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	configure(config, callback) {
		config = config || {};

		this.config = config;
		this.threshold = config.threshold || 1000;
		this.count = 0;
		if(callback) callback();
	}

	/**
	 * Processes and logs messages based on the configured threshold.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	transport(entry, callback) {
		this.count++;

		if(this.count%this.threshold==0)
			logger.info(`Received ${this.count} messages`);

		callback(null,entry);
	}
}

module.exports = StatTransporter;
