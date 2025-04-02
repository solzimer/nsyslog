const
	extend = require("extend"),
	Processor = require("./"),
	stringify = require('csv-stringify'),
	jsexpr = require("jsexpr");

/**
 * CSVOutProcessor class for converting log entries to CSV format.
 * @extends Processor
 */
class CSVOutProcessor extends Processor {
	/**
	 * Creates an instance of CSVOutProcessor.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
		this.workers = [];
		this.seq = 0;
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {string} [config.output='csvout'] - The output field to store the CSV string.
	 * @param {Array<string>} [config.fields=[]] - The fields to include in the CSV output.
	 * @param {Object} [config.options={}] - Options for the CSV stringifier (e.g., delimiter, header).
	 * @param {Function} callback - The callback function.
	 */
	configure(config, callback) {
		this.config = extend({}, config);
		this.output = jsexpr.assign(this.config.output || "csvout");
		this.fields = (this.config.fields || []).map(f => jsexpr.expr(f));
		this.options = this.config.options || {};

		callback();
	}

	/**
	 * Starts the processor.
	 * @param {Function} callback - The callback function.
	 */
	start(callback) {
		callback();
	}

	/**
	 * Processes a log entry and converts it to CSV format.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function.
	 */
	process(entry, callback) {
		let arr = this.fields.map(fn => fn(entry));
		stringify([arr], this.options, (err, res) => {
			this.output(entry, res);
			callback(err, entry);
		});
	}
}

module.exports = CSVOutProcessor;
