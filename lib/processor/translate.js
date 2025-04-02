const
	extend = require("extend"),
	Processor = require("./"),
	fs = require("fs-extra"),
	Path = require('path'),
	jsexpr = require("jsexpr");

const DEF_CONF = {
	map: {},
	file: null,
	fields: []
};

/**
 * TranslateProcessor class extends Processor to translate field values based on a mapping.
 * It supports dynamic mappings from configuration or external files.
 */
class TranslateProcessor extends Processor {
	/**
	 * Constructs a new TranslateProcessor instance.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {Object} [config.map={}] - A mapping of input values to translated values.
	 * @param {string} [config.file=null] - Path to an external file containing additional mappings.
	 * @param {Array} [config.fields=[]] - Array of field mappings with input and output expressions.
	 * @param {Function} callback - The callback function to be called after configuration.
	 */
	async configure(config, callback) {
		this.config = extend({}, DEF_CONF, config);
		this.map = this.config.map;

		// Compile expressions for dynamic mappings
		Object.keys(this.map).forEach(k => {
			let v = this.map[k];
			if (typeof (v) === 'number') return;
			if (typeof (v) === 'object' || v.indexOf('${') >= 0) {
				this.map[k] = jsexpr.expr(v);
			}
		});

		// Compile input and output expressions for fields
		this.fields = this.config.fields.map(f => {
			return {
				input: jsexpr.expr(f.input),
				output: jsexpr.assign(f.output)
			};
		});

		// Load additional mappings from an external file if specified
		if (this.config.file) {
			let path = Path.resolve(this.config.$path, this.config.file);
			let file = await fs.readFile(path, 'utf-8');
			try {
				let json = JSON.parse(file);
				extend(this.map, json);
			} catch (err) {
				return callback(err);
			}
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
	 * Processes a log entry by translating field values based on the configured mappings.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function to be called after processing.
	 */
	process(entry, callback) {
		let fields = this.fields, flen = fields.length;
		for (let i = 0; i < flen; i++) {
			let f = fields[i];
			let val = f.input(entry); // Extract the input value
			let trans = this.map[val]; // Translate the value using the mapping
			if (typeof (trans) === 'undefined') trans = this.map["*"]; // Default translation
			if (typeof (trans) === 'undefined') trans = val; // Fallback to the original value
			if (typeof (trans) === 'function') trans = trans(entry); // Evaluate dynamic translation
			f.output(entry, trans); // Assign the translated value to the output field
		}
		callback(null, entry);
	}
}

module.exports = TranslateProcessor;
