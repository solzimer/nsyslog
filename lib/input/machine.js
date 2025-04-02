const Input = require('.'),
	MachineCollector = require('../machine');

/**
 * Class representing a machine stats collector input.
 * Extends the base Input class to handle machine-specific input.
 */
class MachineInput extends Input {
	/**
	 * Creates an instance of MachineInput.
	 * @param {string} id - The unique identifier for the input.
	 * @param {string} type - The type of the input.
	 */
	constructor(id, type) {
		super(id, type);
		// Default machine collector instance
		this.collector = MachineCollector.default;
		// Callback function for handling events
		this.cb = null;
	}

	/**
	 * Gets the mode of the input.
	 * @returns {string} The mode of the input (push mode).
	 */
	get mode() {
		return Input.MODE.push;
	}

	/**
	 * Configures the MachineInput with the provided settings.
	 * @param {Object} config - Configuration object.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config, callback) {
		// Configuration logic can be added here
		callback();
	}

	/**
	 * Starts the MachineInput and begins collecting machine stats.
	 * @param {Function} callback - Callback function to process collected data.
	 */
	start(callback) {
		// Define the callback to handle incoming data
		this.cb = (data) => callback(null, {
			id: this.id,
			type: this.type,
			originalMessage: data
		});
		// Attach the event listener
		this.collector.on(MachineCollector.Event.status, this.cb);
	}

	/**
	 * Stops the MachineInput and performs cleanup.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		if (this.cb) {
			// Remove the event listener
			this.collector.removeListener(MachineCollector.Event.status, this.cb);
			this.cb = null;
		}
		callback();
	}

	/**
	 * Pauses the MachineInput by halting data collection.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		if (this.cb) {
			// Remove the event listener
			this.collector.removeListener(MachineCollector.Event.status, this.cb);
		}
		callback();
	}

	/**
	 * Resumes the MachineInput by restarting data collection.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		if (this.cb) {
			// Remove and reattach the event listener
			this.collector.removeListener(MachineCollector.Event.status, this.cb);
			this.collector.on(MachineCollector.Event.status, this.cb);
		}
		callback();
	}

	/**
	 * Generates a unique key for the given entry.
	 * @param {Object} entry - The entry object containing input and type.
	 * @returns {string} The generated key.
	 */
	key(entry) {
		return `${entry.input}:${entry.type}`;
	}
}

module.exports = MachineInput;
