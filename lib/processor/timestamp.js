const Processor = require("./"),
	extend = require("extend"),
	{ date } = require("../util"),
	jsexpr = require("jsexpr");

/**
 * TimestampProcessor class extends Processor to parse and convert a date string into a JavaScript Date object.
 */
class TimestampProcessor extends Processor {
	/**
	 * Constructs a new TimestampProcessor instance.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {string} [config.input] - The input expression to extract the date string.
	 * @param {string} [config.format] - The format of the input date string (optional).
	 * @param {string} [config.field="timestamp"] - The output field to store the parsed Date object.
	 * @param {boolean} [config.unix=false] - Whether to output the timestamp as a Unix timestamp (milliseconds since epoch).
	 * @param {Function} callback - The callback function to be called after configuration.
	 */
	configure(config, callback) {
		this.config = extend({}, config);

		this.input = this.config.input ? jsexpr.expr(this.config.input) : null;
		this.format = this.config.format ? jsexpr.expr(this.config.format) : undefined;
		this.field = jsexpr.assign(this.config.field || this.config.output || "timestamp");
		this.unix = this.config.unix || false; // Default to false (output as Date object)
		callback();
	}

	/**
	 * Processes a log entry by parsing a date string and converting it to a Date object or Unix timestamp.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function to be called after processing.
	 */
	process(entry, callback) {
		try {
			let format = this.format ? this.format(entry) : undefined;
			let input = this.input ? this.input(entry) : undefined;
			let ts = input ? date(input, format).toDate() : new Date(); // Parse the date or use the current date

			this.field(entry, this.unix ? ts.getTime() : ts); // Assign the parsed timestamp to the output field
			callback(null, entry); // Call the callback with the processed entry
		} catch (err) {
			callback(err, entry); // Call the callback with the error
		}
	}
}

module.exports = TimestampProcessor;