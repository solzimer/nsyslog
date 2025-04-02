const Processor = require("./");

/**
 * SequenceProcessor class extends Processor to add a sequential number to log entries.
 */
class SequenceProcessor extends Processor {
	/**
	 * Constructs a new SequenceProcessor instance.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {number} [config.start=0] - The starting value for the sequence.
	 * @param {Function} callback - The callback function to be called after configuration.
	 */
	configure(config, callback) {
		this.config = config;
		this.seq = config.start || 0; // Initialize the sequence with the starting value
		callback();
	}

	/**
	 * Processes a log entry by adding a sequential number.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function to be called after processing.
	 */
	process(entry, callback) {
		entry.seq = this.seq++; // Add the sequence number to the entry and increment it
		callback(null, entry); // Call the callback with the processed entry
	}
}

module.exports = SequenceProcessor;
