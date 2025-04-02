const
	extend = require("extend"),
	Processor = require("./"),
	logger = require('../logger'),
	jsexpr = require("jsexpr");

const MODE = {
	"array": "array",
	"item": "item",
	"map": "map"
};

/**
 * SplitProcessor class extends Processor to split a string or array into multiple parts.
 */
class SplitProcessor extends Processor {
	/**
	 * Constructs a new SplitProcessor instance.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {string} [config.input="${originalMessage}"] - The input expression to extract the value to split.
	 * @param {string} [config.output="splitted"] - The output field to store the result.
	 * @param {string} [config.separator=" "] - The separator to use for splitting the input.
	 * @param {string} [config.mode="array"] - The mode of splitting: "array", "item", or "map".
	 * @param {string[]} [config.map] - Array of field names for mapping split values (used in "map" mode).
	 * @param {Function} callback - The callback function to be called after configuration.
	 */
	configure(config, callback) {
		this.config = extend({}, config);
		this.input = jsexpr.expr(this.config.input || '${originalMessage}');
		this.output = jsexpr.assign(this.config.output || "splitted");
		this.separator = this.config.separator || " ";
		this.mode = MODE[this.config.mode] || MODE.array;
		this.map = this.config.map || null;
		if (this.map) {
			this.map = this.map.map(f => jsexpr.assign(f));
		}
		callback();
	}

	/**
	 * Starts the processor (no-op for this processor).
	 * @param {Function} callback - The callback function to be called after starting.
	 */
	start(callback) {
		callback();
	}

	/**
	 * Processes a log entry by splitting the input value based on the configuration.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function to be called after processing.
	 */
	process(entry, callback) {
		let val = this.input(entry); // Extract the input value

		// Ensure the value is an array
		if (!Array.isArray(val))
			val = `${val}`.split(this.separator);

		// Handle "map" mode
		if (this.map || this.mode == MODE.map) {
			let out = {};
			let map = this.map;
			let len = map.length;
			for (let i = 0; i < len; i++) {
				this.map[i](out, val[i]);
			}
			this.output(entry, out);
			callback(null, entry);
		}
		// Handle "array" mode
		else if (this.mode == MODE.array) {
			this.output(entry, val);
			callback(null, entry);
		}
		// Handle "item" mode
		else if (this.mode == MODE.item) {
			let prall = val.map(item => {
				return new Promise((ok) => {
					try {
						let nentry = extend(true, {}, entry); // Clone the entry
						this.output(nentry, item); // Assign the split item to the output
						this.push(nentry, ok); // Push the new entry
					} catch (err) {
						logger.error(`[${this.id}]`, err); // Log any errors
						ok();
					}
				});
			});

			Promise.all(prall).then(() => callback());
		}
	}
}

module.exports = SplitProcessor;
