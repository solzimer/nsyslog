/**
 * ZMQTransporter is a transporter that sends log entries using ZeroMQ.
 * It supports two modes: push and pub.
 */
const
	Transporter = require("./"),
	extend = require('extend'),
	expression = require("jsexpr"),
	logger = require('../logger'),
	zmq = require('zeromq'),
	pushSocket = zmq.socket('push'),
	pubSocket = zmq.socket('pub');

const MODES = {
	// Modes of operation for ZeroMQ.
	push : "push",
	pub : "pub"
};

const DEFAULTS = {
	// Default configuration for ZMQTransporter.
	url : "tcp://localhost:6666",
	mode : "push",
	channel : "_test_",
	format : "${originalMessage}"
};

class ZMQTransporter extends Transporter {
	/**
	 * Constructs a ZMQTransporter instance.
	 * @param {string} id - The identifier for the transporter.
	 * @param {string} type - The type of the transporter.
	 */
	constructor(id,type) {
		super(id,type);
	}

	/**
	 * Configures the ZMQTransporter with the provided settings.
	 * @param {Object} config - Configuration object.
	 * @param {string} [config.url="tcp://localhost:6666"] - ZeroMQ connection URL.
	 * @param {string} [config.mode="push"] - Mode of operation (push or pub).
	 * @param {string} [config.channel="_test_"] - Channel for pub mode.
	 * @param {string} [config.format="${originalMessage}"] - Format for log messages.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	configure(config, callback) {
		config = extend({},DEFAULTS,config);

		this.url = config.url;
		this.msg = expression.expr(config.format);
		this.channel = expression.expr(config.channel);
		this.zmode = config.mode;
		callback();
	}

	/**
	 * Starts the ZMQTransporter by binding to the specified ZeroMQ URL.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	start(callback) {
		logger.info(`${this.id} Starting ZQM on`,this.url);

		if(this.zmode==MODES.pub)
			this.socket = pubSocket.bind(this.url,err=>{
				if(err) logger.error(`${this.id} Error binding zmq on`,this.url,err.message);
				else logger.info(`${this.id} zqm bound to`,this.url);
				callback(err);
			});
		else {
			this.socket = pushSocket.bind(this.url,err=>{
				if(err) logger.error(`${this.id} Error binding zmq on`,this.url,err.message);
				else logger.info(`${this.id} zqm bound to`,this.url);
				callback(err);
			});
		}
	}

	/**
	 * Sends a log entry using ZeroMQ based on the configured mode.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	transport(entry,callback) {
		let msg = this.msg(entry);

		if(typeof(msg)!='string')
			msg = JSON.stringify(msg);

		if(this.zmode==MODES.pub) {
			let channel = this.channel(entry);
			this.socket.send([channel,msg],null,callback);
		}
		else {
			this.socket.send(msg,null,callback);
		}
	}

	/**
	 * Stops the ZMQTransporter by unbinding from the ZeroMQ URL.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		this.socket.unbind(this.url,callback);
	}
}

module.exports = ZMQTransporter;
