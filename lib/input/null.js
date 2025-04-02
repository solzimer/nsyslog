const Input = require('./');

/**
 * NullInput class for testing or placeholder purposes.
 * This input does not produce any data and serves as a no-op implementation.
 * Extends the base Input class.
 */
class NullInput extends Input {
	/**
	 * Configures the NullInput with the provided settings.
	 * 
	 * @param {Object} config - Configuration object (not used).
	 * @param {Function} callback - Callback function to signal completion.
	 */
	configure(config, callback) {
		callback();
	}

	/**
	 * Returns the mode of the input.
	 * @returns {string} The mode of the input (pull).
	 */
	get mode() {
		return Input.MODE.pull;
	}

	/**
	 * Starts the NullInput.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	start(callback) {
		callback();
	}

	/**
	 * Stops the NullInput.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		callback();
	}

	/**
	 * Retrieves the next item from the NullInput.
	 * This method does nothing as the NullInput does not produce any data.
	 * 
	 * @param {Function} callback - Callback function (not used).
	 */
	next(callback) {
		// No operation
	}
}

module.exports = NullInput;
