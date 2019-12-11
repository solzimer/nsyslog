const
	Transporter = require("./"),
	extend = require('extend'),
	jsexpr = require("jsexpr"),
	logger = require('../logger'),
	URL = require('url'),
	Redis = require('ioredis');

const DEFAULTS = {
	url : "redis://localhost:6379",
	channel : "nsyslog",
	format : '${JSON}'
};

const vfn = (entry)=>entry;

class RedisTransporter extends Transporter {
	constructor(id,type) {
		super(id,type);
	}

	async configure(config, callback) {
		config = extend({},DEFAULTS,config);

		this.url = config.url || DEFAULTS.url;
		this.channel = jsexpr.expr(config.channel || 'nsyslog');
		this.msg = config.format? jsexpr.expr(config.format) : vfn;

		callback();
	}

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

	transport(entry,callback) {
		let msg = this.msg(entry);
		let channel = this.channel(entry);

		this.client.publish(channel,typeof(msg)=='string'?msg:JSON.stringify(msg));
		callback();
	}

	stop(callback) {
		if(this.client)
			this.client.disconnect();
		callback();
	}
}

module.exports = RedisTransporter;
