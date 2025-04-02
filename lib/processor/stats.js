const	
	Processor = require("./"),
	logger = require("../logger");

/**
 * StatsProcessor class extends Processor to track and log statistics about flows in log entries.
 */
class StatsProcessor extends Processor {
	/**
	 * Constructs a new StatsProcessor instance.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
		this.map = {}; // Map to store flow counts
		this.ival = null; // Interval for periodic logging
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {string} [config.level="info"] - The log level to use for reporting statistics.
	 * @param {Function} callback - The callback function to be called after configuration.
	 */
	configure(config, callback) {
		this.level = config.level || "info"; // Default log level is "info"
		callback();
	}

	/**
	 * Processes a log entry by updating flow statistics and periodically logging them.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function to be called after processing.
	 */
	process(entry, callback) {
		var map = this.map;

		// Update flow counts
		entry.flows.forEach(f => {
			map[f] = map[f] || 0;
			map[f]++;
		});

		// Set up periodic logging if not already set
		if (!this.ival) {
			this.ival = setInterval(() => {
				for (var i in map) {
					// Log the flow statistics
					(logger[this.level] || logger.info)(process.pid, `Flow ${i} => ${map[i]}`);
					map[i] = 0; // Reset the count after logging
				}
			}, 10000); // Log every 10 seconds
		}

		callback(null, entry); // Call the callback with the processed entry
	}
}

module.exports = StatsProcessor;
