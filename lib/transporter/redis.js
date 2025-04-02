/**
 * RedisTransporter is a transporter that sends log entries to a Redis endpoint.
 * It supports multiple modes such as publish, set, and script.
 */
const
	Transporter = require("./"),
	extend = require('extend'),
	jsexpr = require("jsexpr"),
	logger = require('../logger'),
	URL = require('url'),
	Redis = require('ioredis');

const MODE = {
	publish : 'publish',
	set : 'set',
	script : 'script'
}
const DEFAULTS = {
	url : "redis://localhost:6379",
	channel : "nsyslog",
	key : 'nsyslog',
	format : '${JSON}'
};

const vfn = (entry)=>entry;

class RedisTransporter extends Transporter {
	/**
	 * Constructs a RedisTransporter instance.
	 * @param {string} id - The identifier for the transporter.
	 * @param {string} type - The type of the transporter.
	 */
	constructor(id,type) {
		super(id,type);
	}

	/**
	 * Configures the RedisTransporter with the provided settings.
	 * @param {Object} config - Configuration object.
	 * @param {string} [config.url="redis://localhost:6379"] - Redis connection URL.
	 * @param {string} [config.channel="nsyslog"] - Redis channel for publishing.
	 * @param {string} [config.key="nsyslog"] - Redis key for storing data.
	 * @param {string} [config.format="${JSON}"] - Format for log messages.
	 * @param {string} [config.mode="publish"] - Mode of operation (publish, set, script).
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config, callback) {
		config = extend({},DEFAULTS,config);

		this.url = config.url || DEFAULTS.url;
		this.channel = jsexpr.expr(config.channel || DEFAULTS.channel);
		this.key = jsexpr.expr(config.key || DEFAULTS.key);
		this.msg = config.format? jsexpr.expr(config.format) : vfn;
		this.mode = MODE[config.mode] || MODE.publish;

		callback();
	}

	/**
	 * Establishes a connection to the Redis endpoint.
	 * @returns {Promise<Redis|Redis.Cluster>} A promise that resolves to the Redis client.
	 */
	connect() {
		let hosts = (Array.isArray(this.url)? this.url : [this.url]).
			map(url=>URL.parse(url)).
			map(url=>`${url.hostname||'localhost'}:${url.port||6379}`);

		return new Promise((resolve,reject)=>{
			let cluster = new Redis.Cluster(hosts);

			cluster.on("ready",()=>{
				cluster.removeAllListeners("error");
				cluster.removeAllListeners("connected");
				resolve(cluster);
			});

			cluster.on("error",err=>{
				logger.warn("Redis cluster not availables");
				cluster.removeAllListeners("error");
				cluster.removeAllListeners("connected");
				cluster.disconnect();

				let client = new Redis(hosts[0].port,hosts[0].host);
				client.on("error",(err)=>{
					logger.error("Redis connection not available");
					client.disconnect();
					client.removeAllListeners("error");
					client.removeAllListeners("ready");
					reject(err);
				});
				client.on("ready",()=>{
					client.removeAllListeners("error");
					client.removeAllListeners("ready");
					resolve(client);
				});
			});
		});
	}

	/**
	 * Starts the RedisTransporter by connecting to the Redis endpoint.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async start(callback) {
		logger.info('Start transporter on redis endpoint', this.url);

		try {
			this.client = await this.connect();
			logger.info('Redis endpoint connected', this.channels);
		}catch(err) {
			return callback(err);
		}

		callback();
	}

	/**
	 * Sends a log entry to the Redis endpoint based on the configured mode.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	transport(entry,callback) {
		let msg = this.msg(entry);
		msg = typeof(msg)=='string'? msg : JSON.stringify(msg);

		switch(this.mode) {
			case MODE.publish :
				let channel = this.channel(entry);
				this.client.publish(channel,msg);
				break;
			case MODE.set :
				let key = this.key(entry);
				this.client.set(key,msg);
				break;
		}

		callback();
	}

	/**
	 * Stops the RedisTransporter by disconnecting from the Redis endpoint.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		if(this.client)
			this.client.disconnect();
		callback();
	}
}

module.exports = RedisTransporter;
