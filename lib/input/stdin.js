const Input = require('./'),
	readline = require('readline');

const FORMAT = {
	raw: "raw",
	json: "json"
};

/**
 * StdinInput class for reading input from the standard input (stdin).
 * This input is useful for testing or scenarios where data is piped into the application.
 * Extends the base Input class.
 */
class StdinInput extends Input {
	/**
	 * Constructor for StdinInput.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);
		this.paused = false; // Indicates whether the input is paused
	}

	/**
	 * Configures the StdinInput with the provided settings.
	 * 
	 * @param {Object} config - Configuration object containing:
	 * @param {string} [config.format="raw"] - Format of the input data. Can be "raw" or "json".
	 * @param {Function} callback - Callback function to signal completion.
	 */
	configure(config, callback) {
		config = config || {};
		this.format = FORMAT[config.format] || FORMAT.raw;
		callback();
	}

	/**
	 * Returns the mode of the input.
	 * @returns {string} The mode of the input (push).
	 */
	get mode() {
		return Input.MODE.push;
	}

	/**
	 * Starts the StdinInput and begins reading from stdin.
	 * 
	 * @param {Function} callback - Callback function to process incoming lines.
	 */
	start(callback) {
		this.rl = readline.createInterface({
			input: process.stdin
		});

		this.rl.on('line', line => {
			if (this.paused) return;
			this.send(line, callback);
		});
	}

	/**
	 * Processes a line of input and sends it to the callback.
	 * 
	 * @param {string} line - The line of input to process.
	 * @param {Function} callback - Callback function to process the input line.
	 */
	send(line, callback) {
		if (this.paused) return;

		if (this.format == FORMAT.json) {
			try {
				line = JSON.parse(line);
			} catch (err) {
				// If parsing fails, keep the line as raw
			}
		}
		let entry = { originalMessage: line };
		callback(null, entry);
	}

	/**
	 * Stops the StdinInput and closes the readline interface.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		this.rl.once('close', callback);
		this.rl.close();
	}

	/**
	 * Pauses the StdinInput, preventing further processing of input lines.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		this.paused = true;
		callback();
	}

	/**
	 * Resumes the StdinInput, allowing processing of input lines.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		this.paused = false;
		callback();
	}
}

module.exports = StdinInput;
