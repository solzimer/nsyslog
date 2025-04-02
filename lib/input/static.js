const Input = require('./');

/**
 * StaticInput class for providing static, predefined input data.
 * This input is useful for testing or scenarios where a fixed set of data needs to be processed.
 * Extends the base Input class.
 */
class StaticInput extends Input {
	/**
	 * Constructor for StaticInput.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Returns the mode of the input.
	 * @returns {string} The mode of the input (pull).
	 */
	get mode() {
		return Input.MODE.pull;
	}

	/**
	 * Configures the StaticInput with the provided settings.
	 * 
	 * @param {Object} config - Configuration object containing:
	 * @param {boolean} [config.loop=false] - Whether to loop through the lines indefinitely.
	 * @param {Array<string>} [config.lines=[]] - Array of static lines to be returned as input.
	 * @param {number} [config.interval=0] - Interval in milliseconds between each line being returned.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config, callback) {
		config = config || {};

		this.loop = config.loop || false;
		this.lines = config.lines || [];
		this.ival = config.interval || 0;
		this.wm = 0; // Watermark to track the current line index

		callback();
	}

	/**
	 * Starts the StaticInput.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	start(callback) {
		callback();
	}

	/**
	 * Retrieves the next item from the static input.
	 * 
	 * @param {Function} callback - Callback function to process the next item.
	 */
	async next(callback) {
		let wm = this.loop ? this.wm % this.lines.length : this.wm;
		let line = this.lines[wm];
		this.wm++;
		if (line) {
			if (!this.ival)
				setImmediate(() => callback(null, { originalMessage: line }));
			else
				setTimeout(() => callback(null, { originalMessage: line }), this.ival);
		}
	}

	/**
	 * Stops the StaticInput.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		callback();
	}

	/**
	 * Pauses the StaticInput.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		this.stop(callback);
	}

	/**
	 * Resumes the StaticInput.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		this.start(callback);
	}

	/**
	 * Generates a unique key for the input entry.
	 * 
	 * @param {Object} entry - Input entry object.
	 * @returns {string} Unique key for the entry.
	 */
	key(entry) {
		return `${entry.input}:${entry.type}`;
	}
}

module.exports = StaticInput;
