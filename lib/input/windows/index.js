const
	Input = require('..'),
    extend = require('extend'),
    WindowsPoll = require('./windows-poll'),
    WindowsSubs = require('./windows-subs');
    
const DEF_CONFIG = {
    channel: "Application",
    readmode: "offset",
    offset: 'end',
    mode: "subscription"
};

/**
 * WindowsInput class for reading Windows Event Logs.
 * Extends the base Input class.
 */
class WindowsInput extends Input {
    #instance = null;

	/**
	 * Constructor for WindowsInput.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the WindowsInput with the provided settings.
	 * 
	 * @param {Object} config - Configuration object containing:
	 * @param {string} [config.channel="Application"] - Event log channel to read from.
	 * @param {string} [config.mode="subscription"] - Mode of the input (subscription or polling).
	 * @param {string} [config.readmode="offset"] - Read mode (offset or watermark).
	 * @param {string|number} [config.offset] - Offset for reading events.
	 * @param {number} [config.batchsize=100] - Number of events to fetch in each batch.
	 * @param {string} [config.query] - Query to filter events.
	 * @param {string} [config.format="json"] - Format of the output (json or xml).
	 * @param {Array<number>} [config.idfilter] - Array of event IDs to filter.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config, callback) {
		config = config || {};
        config = extend(true,{}, DEF_CONFIG, config);

        if(config.mode == "subscription") {
            this.#instance = new WindowsSubs(this.id, this.type);
        }
        else {
            this.#instance = new WindowsPoll(this.id, this.type);
        }

        return this.#instance.configure(config, callback);
	}

	/**
	 * Returns the mode of the input.
	 * @returns {string} The mode of the input (pull).
	 */
	get mode() {
		return this.#instance.mode;
	}

	/**
	 * Retrieves the next event from the queue.
	 * 
	 * @param {Function} callback - Callback function to process the next event.
	 */
	async next(callback) {
		return this.#instance.next(callback);
	}

	/**
	 * Starts the WindowsInput and begins reading events.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async start(callback) {
		return this.#instance.start(callback);
	}

	/**
	 * Stops the WindowsInput and performs cleanup.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async stop(callback) {
		return this.#instance.stop(callback);}
	/**
	 * Pauses the WindowsInput, saving the current watermark state.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async pause(callback) {
		return this.#instance.pause(callback);
	}

	/**
	 * Resumes the WindowsInput.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async resume(callback) {
		return this.#instance.resume(callback);
	}
}

module.exports = WindowsInput;
