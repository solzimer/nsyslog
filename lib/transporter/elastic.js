const
	Transporter = require("./"),
	TLS = require("../tls"),
	jsexpr = require("jsexpr"),
	extend = require("extend"),
	logger = require("../logger"),
	elastic = require('@elastic/elasticsearch');

const { Client } = elastic;
const nofn = entry=>entry;
const COPTS = {
	maxRetries: 5,
	requestTimeout: 60000,
	sniffOnStart: true
};
const DEF_CONF = {
	url : "http://localhost:9200",
	index : "nsyslog",
	tls : TLS.DEFAULT,
	headers : {
		'Content-Type' : "application/json"
	}
};

/**
 * ElasticTransporter is a transporter for sending log messages to an ElasticSearch server or cluster.
 * 
 * @extends Transporter
 */
class ElasticTransporter extends Transporter {
	/**
	 * Creates an instance of ElasticTransporter.
	 * 
	 * @param {string} id - The unique identifier for the transporter.
	 * @param {string} type - The type of the transporter.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the transporter with the provided settings.
	 * 
	 * @param {Object} config - Configuration object for the transporter.
	 * @param {string|string[]} [config.url="http://localhost:9200"] - The URL(s) of the ElasticSearch server(s).
	 * @param {string} [config.index="nsyslog"] - The ElasticSearch index to use.
	 * @param {Object} [config.tls=TLS.DEFAULT] - TLS options for secure connections.
	 * @param {Object} [config.headers] - HTTP headers for the requests.
	 * @param {Object} [config.options] - Additional options for the ElasticSearch client.
	 * @param {string} [config.format] - The format of the log message to be sent.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config, callback) {
		this.config = config = extend(true,{},DEF_CONF,config);
		config.url = Array.isArray(config.url)? config.url : [config.url];

		this.msg = config.format? jsexpr.expr(config.format) : nofn;
		this.url = jsexpr.expr(config.url);
		this.index = jsexpr.expr(config.index);
		this.headers = jsexpr.expr(config.headers);
		this.istls = config.url.some(url=>url.startsWith('https'));
		this.options = jsexpr.expr(config.options || {});

		if(this.istls) {
			this.tls = await TLS.configure(config.tls,config.$path);
			this.options.agentOptions = this.tls;
		}

		let copts = extend(true,COPTS,config.options,{node:config.url,auth:config.auth,ssl:this.tls});
		this.client = new Client(copts);

		callback();
	}

	/**
	 * Starts the transporter.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async start(callback) {
		callback();
	}

	/**
	 * Resumes the transporter.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		callback();
	}

	/**
	 * Pauses the transporter.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		callback();
	}

	/**
	 * Closes the transporter.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	close(callback) {
		callback();
	}

	/**
	 * Generates a unique key for the log entry.
	 * 
	 * @param {Object} entry - The log entry.
	 * @returns {string} - The unique key for the entry.
	 */
	key(entry) {
		return `${entry.id}:${entry.type}`;
	}

	/**
	 * Transports a log entry to the ElasticSearch server.
	 * 
	 * @param {Object} entry - The log entry to be transported.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async transport(entry,callback) {
		try {
			await this.client.index({
				index: this.index(entry),
				body: this.msg(entry)
			});
		}catch(err) {
			logger.error(err);
			callback(err,entry);
		}
		callback(null,entry);
	}
}

module.exports = ElasticTransporter;
