const
	extend = require("extend"),
	Processor = require("./"),
	jsexpr = require("jsexpr");

/**
 * ArrayProcessor class for buffering and batching log entries.
 * @extends Processor
 */
class ArrayProcessor extends Processor {
	/**
	 * Creates an instance of ArrayProcessor.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {string} [config.field='array'] - The output field to store the batched entries.
	 * @param {number} [config.max=1000] - The maximum number of entries in a batch.
	 * @param {number} [config.timeout=0] - The timeout in milliseconds for sending batches.
	 * @param {Function} callback - The callback function.
	 */
	configure(config, callback) {
		this.config = extend({}, config);
		this.max = this.config.max || 1000;
		if (this.max < 0) this.max = Infinity;
		this.timeout = this.config.timeout || 0;
		this.field = jsexpr.assign(this.config.field || "array");
		this.buffer = [];
		callback();
	}

	/**
	 * Starts the processor.
	 * @param {Function} callback - The callback function.
	 */
	start(callback) {
		if (this.timeout > 0) {
			this.ival = setInterval(() => {
				this.send();
			}, this.timeout);
		}
		callback();
	}

	/**
	 * Sends the buffered log entries as a batch.
	 */
	send() {
		let arr = this.buffer.splice(0, this.max);
		let list = arr.map(el => el.entry);
		let out = {};
		this.field(out, list);
		arr.forEach((el, i) => {
			if (i == 0) el.callback(null, out);
			else el.callback();
		});
	}

	/**
	 * Processes a log entry and adds it to the buffer.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function.
	 */
	process(entry, callback) {
		this.buffer.push({ entry, callback });
		if (this.timeout <= 0 && this.buffer.length >= this.max) {
			this.send();
		}
	}
}

module.exports = ArrayProcessor;
