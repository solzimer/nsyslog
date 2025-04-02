const
	extend = require("extend"),
	Processor = require("./"),
	jsexpr = require("jsexpr");

/**
 * JSONParserProcessor class for parsing JSON strings into objects.
 * @extends Processor
 */
class JSONParserProcessor extends Processor {
	/**
	 * Creates an instance of JSONParserProcessor.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {string} [config.input='${originalMessage}'] - The input field containing the JSON string.
	 * @param {string} [config.output=null] - The output field to store the parsed object.
	 * @param {Function} callback - The callback function.
	 */
	configure(config, callback) {
		// Merge default and provided configurations
		this.config = extend({}, config);
		this.output = this.config.output ? jsexpr.assign(this.config.output) : null;
		this.input = jsexpr.expr(this.config.input || "${originalMessage}");
		this.unpack = this.config.unpack || false;	// unpack properties that are objects, like "prop1.subprop2 : value" => { prop1: { subprop2: value } }

		callback();
	}

	/**
	 * Unpacks properties with dot-separated keys into nested objects.
	 * @param {Object} obj - The object to unpack.
	 * @returns {Object} - The unpacked object.
	 */
	unpackJson(obj) {
		let result = {};
		for (let key in obj) {
			if (obj.hasOwnProperty(key)) {
				let parts = key.split('.');
				let current = result;
				for (let i = 0; i < parts.length; i++) {
					if (i === parts.length - 1) {
						current[parts[i]] = obj[key];
					} else {
						current = current[parts[i]] = current[parts[i]] || {};
					}
				}
			}
		}
		return result;
	}

	/**
	 * Starts the processor.
	 * @param {Function} callback - The callback function.
	 */
	start(callback) {
		callback();
	}

	/**
	 * Processes a log entry and parses its JSON string.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function.
	 */
	process(entry, callback) {
		// Extract the input message
		let msg = this.input(entry);

		try {
			// Parse the JSON string
			let res = typeof(msg)=='string'? JSON.parse(msg) : msg;

			if(this.unpack) {
				res = this.unpackJson(res);
			}
			
			// Assign the parsed object to the output or extend the entry
			if (this.output) {
				this.output(entry, res);
			} else {
				extend(entry, res);
			}

			callback(null, entry);
		} catch (err) {
			// Handle JSON parsing errors
			callback(err, null);
		}
	}
}

module.exports = JSONParserProcessor;
