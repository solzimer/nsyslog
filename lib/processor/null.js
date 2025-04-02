const Processor = require("./");

/**
 * NullProcessor class extends Processor to perform no operation on log entries.
 * This processor simply passes the input entry to the output without modification.
 */
class NullProcessor extends Processor {
	/**
	 * Constructs a new NullProcessor instance.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Processes a log entry without making any changes.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function to be called after processing.
	 */
	process(entry, callback) {
		callback(null, entry); // Pass the entry through without modification
	}
}

module.exports = NullProcessor;
