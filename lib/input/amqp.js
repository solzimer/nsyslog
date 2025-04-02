const
	logger = require('../logger'),
    amqp = require('amqplib'),
    timer = require('../util').timer,
	Input = require('./');

// Supported message formats
const FORMAT = {
	raw : "raw",
	json : "json"
};

// Default configuration values
const DEFAULTS = {
	url : "amqp://localhost",
	channel : "test",
	format : "raw"
};

/**
 * AMQPInput class for handling AMQP-based input.
 * Extends the base Input class.
 */
class AMQPInput extends Input {
	/**
	 * Constructor for AMQPInput.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);
		this.paused = false; // Indicates if the input is paused
        this.conn = false; // Connection status
	}

	/**
	 * Configures the AMQP input with the provided settings.
	 * @param {Object} config - Configuration object.
	 * @param {string} [config.url] - AMQP server URL.
	 * @param {string} [config.queue] - Queue name to consume messages from.
	 * @param {string} [config.format] - Message format (raw or json).
	 * @param {Function} callback - Callback function to signal completion.
	 */
	configure(config, callback) {
		config = config || {};
		this.url = config.url || DEFAULTS.url;
		this.queue = config.queue || DEFAULTS.queue;
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
	 * Establishes a connection to the AMQP server and creates a channel.
	 * Retries on failure with a delay.
	 * @returns {Promise<Object>} The AMQP channel.
	 */
	async connect() {
        while (!this.conn) {
            try {
                let client = await amqp.connect(this.url);
                let channel = await client.createChannel();
            
                await channel.assertQueue(this.queue);
                this.conn = true;
                return channel;
            } catch (err) {
                logger.error(`[${this.id}]`, err);
                this.conn = false;
                await timer(5000); // Retry after 5 seconds
            }
        }
	}

	/**
	 * Starts consuming messages from the configured queue.
	 * Processes messages using the provided callback function.
	 * @param {Function} callback - Callback function to process messages.
	 */
	async start(callback) {
        let channel = await this.connect();

        logger.info('Connected');

        channel.consume(this.queue, (msg) => {
            console.log(msg);
            let data = msg.content.toString();
            
            if (this.format == FORMAT.json) {
                try {
                    data = JSON.parse(data);
                } catch (err) {
                    logger.warn(`[${this.id}]`, err);
                }
            }

            channel.ack(msg); // Acknowledge the message
            callback(null, {
                id: this.id,
                type: 'amqp',
                queue: this.queue,
                url: this.url,
                originalMessage: data
            });
        });
	}

	/**
	 * Stops the input by performing necessary cleanup.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		callback();
	}

	/**
	 * Pauses the input by halting message consumption.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		this.paused = true;
		callback();
	}

	/**
	 * Resumes the input by restarting message consumption.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		this.paused = false;
		callback();
	}
}

module.exports = AMQPInput;
