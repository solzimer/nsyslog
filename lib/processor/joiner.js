const
	Processor = require("./"),
	jsexpr = require('jsexpr');

const MAX_WAIT = 2000;

/**
 * JoinerProcessor class for joining log entries into a single string.
 * @extends Processor
 */
class JoinerProcessor extends Processor {
	/**
	 * Creates an instance of JoinerProcessor.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
		this.buffer = [];
		this.iva = null;
		this.last = null;
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} conf - The configuration object.
	 * @param {string} [conf.input='${originalMessage}'] - The input field to join.
	 * @param {string} [conf.output='out'] - The output field to store the joined string.
	 * @param {string} [conf.delimiter='\n'] - The delimiter to use between joined entries.
	 * @param {number} [conf.max=1000] - Maximum number of entries to join.
	 * @param {number} [conf.wait=2000] - Maximum wait time in milliseconds before outputting the joined string.
	 * @param {Function} callback - The callback function.
	 */
	configure(conf, callback) {
		// Store configuration and prepare expressions
		this.input = jsexpr.expr(conf.input || '${originalMessage}');
		this.output = jsexpr.assign(conf.output || 'out');
		this.when = jsexpr.eval(conf.when || "true");
		this.delimiter = conf.delimiter || '\n';
		this.max = conf.max || 1000;
		this.wait = conf.wait || MAX_WAIT;
		callback();
	}
	
	/**
	 * Processes a log entry and joins it with others in the buffer.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function.
	 */
	process(entry, callback) {
		// Extract the input message
		let msg = this.input(entry);

		// Check if the buffer should be flushed
		if (this.when(entry) && this.buffer.length) {
			let last = this.last;
			this.output(last, this.buffer.join(this.delimiter));
			this.buffer = [msg];
			this.last = entry;
			return callback(null, last);
		} else {
			// Add the message to the buffer
			if (this.ival)
				clearTimeout(this.ival);

			this.buffer.push(msg);
			while (this.buffer.length > this.max)
				this.buffer.shift();

			// Schedule buffer flush
			this.ival = setTimeout(() => {
				this.output(this.last, this.buffer.join(this.delimiter));
				this.buffer = [];
				this.push(this.last, () => {});
			}, this.wait);

			this.last = entry;
			return callback();
		}
	}
}

module.exports = JoinerProcessor;
