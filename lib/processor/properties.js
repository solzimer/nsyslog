const
	extend = require("extend"),
	Processor = require("./"),
	logger = require("../logger"),
	jsexpr = require("jsexpr");

/**
 * PropertiesProcessor class extends Processor to set or modify properties in log entries.
 */
class PropertiesProcessor extends Processor {
	/**
	 * Constructs a new PropertiesProcessor instance.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {Object} config.set - Object containing the new properties to set.
	 * @param {boolean} [config.extend=true] - Whether to extend the input object with the new properties.
	 * @param {boolean} [config.deep=false] - Whether to deeply merge the new properties if the destination already exists.
	 * @param {string[]} [config.delete=[]] - List of fields to delete from the input object.
	 * @param {Function} callback - The callback function to be called after configuration.
	 */
	configure(config, callback) {
		this.config = config;
		this.expr = config.set ? jsexpr.expr(config.set) : () => {}; // Compile expressions for the "set" properties
		this.extend = config.extend !== false; // Default to true
		this.deep = config.deep || false; // Default to false
		this.del = (config.delete || []).map(f => {
			// Create functions to delete specified fields
			return eval(`(function(){
				return function(entry) {
					entry.${f} = undefined;
				}
			})()`);
		});
		callback();
	}

	/**
	 * Processes a log entry by setting, extending, or deleting properties.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function to be called after processing.
	 */
	process(entry, callback) {
		try {
			// Apply the "set" properties
			if (this.extend) {
				// Extend the entry with the new properties
				if (this.deep) entry = extend(true, entry, this.expr(entry)); // Deep merge
				else entry = Object.assign(entry, this.expr(entry)); // Shallow merge
			} else {
				// Replace the entry with the new properties
				entry = this.expr(entry);
			}

			// Delete specified fields
			let dlen = this.del.length;
			if (dlen) {
				let dels = this.del;
				for (let i = 0; i < dlen; i++) {
					dels[i](entry);
				}
			}

			callback(null, entry); // Call the callback with the processed entry
		} catch (err) {
			logger.error(`Component ${this.id} failed with error`, err); // Log the error
			callback(err, entry); // Call the callback with the error
		}
	}
}

module.exports = PropertiesProcessor;
