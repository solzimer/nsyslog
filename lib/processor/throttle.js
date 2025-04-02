const Processor = require("./");

/**
 * ThrottleProcessor class extends Processor to limit the rate at which log entries are processed.
 * It buffers log entries and processes them at a fixed interval.
 */
class ThrottleProcessor extends Processor {
	/**
	 * Constructs a new ThrottleProcessor instance.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
		this.buffer = []; // Buffer to store log entries
		this.ival = null; // Interval for processing buffered entries
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {number} [config.timeout=0] - The interval in milliseconds to process buffered entries.
	 * @param {Function} callback - The callback function to be called after configuration.
	 */
	configure(config, callback) {
		this.config = config;
		this.timeout = parseInt(config.timeout || 0); // Default timeout is 0 (no throttling)
		callback();
	}

	/**
	 * Starts the processor and begins processing buffered entries at the configured interval.
	 * @param {Function} callback - The callback function to be called after starting.
	 */
	start(callback) {
		if (this.timeout) {
			this.ival = setInterval(() => {
				let item = this.buffer.shift(); // Process the oldest buffered entry
				if (item) {
					item.callback(null, item.entry);
				}
			}, this.timeout);
		}
		callback();
	}

	/**
	 * Stops the processor and clears the processing interval.
	 * @param {Function} callback - The callback function to be called after stopping.
	 */
	stop(callback) {
		if (this.ival) clearInterval(this.ival);
		callback();
	}

	/**
	 * Processes a log entry by buffering it or passing it through immediately.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function to be called after processing.
	 */
	async process(entry, callback) {
		if (this.timeout) {
			this.buffer.push({ entry, callback }); // Buffer the entry for later processing
		} else {
			callback(null, entry); // Pass the entry through immediately
		}
	}
}

module.exports = ThrottleProcessor;
