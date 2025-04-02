const
	extend = require("extend"),
	Processor = require("./"),
	logger = require("../logger"),
	jsexpr = require("jsexpr");

/**
 * MergeProcessor class for merging multiple fields into a single object.
 * @extends Processor
 */
class MergeProcessor extends Processor {
	/**
	 * Creates an instance of MergeProcessor.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {Array<string>} [config.fields=[]] - The fields to merge.
	 * @param {string} [config.output=null] - The output field to store the merged object.
	 * @param {boolean} [config.deep=false] - Whether to perform a deep merge.
	 * @param {Array<string>} [config.delete=[]] - Fields to delete after merging.
	 * @param {Function} callback - The callback function.
	 */
	configure(config, callback) {
		// Store configuration and prepare expressions
		this.config = config;
		this.fields = (config.fields || []).map(f => jsexpr.expr(f));
		this.output = jsexpr.assign(config.output);
		this.deep = config.deep || false;
		this.del = (config.delete || []).map(f => {
			return eval(`(function(){
				return function(entry) {
					delete entry.${f}
				}
			})()`);
		});

		callback();
	}

	/**
	 * Processes a log entry and merges its fields.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function.
	 */
	process(entry, callback) {
		// Extract fields to merge
		let shards = this.fields.map(f => f(entry));

		// Perform the merge
		if (this.deep) shards.unshift(true);
		this.output(entry, extend.apply(extend, shards));

		// Delete specified fields
		this.del.forEach(fn => fn(entry));

		callback(null, entry);
	}
}

module.exports = MergeProcessor;
