const
	logger = require('../logger'),
	Input = require('./'),
	extend = require('extend'),
	Redis = require('ioredis'),
	URL = require('url'),
	Queue = require('../queue');

const FORMAT = {
	raw : "raw",
	json : "json"
}

const DEFAULTS = {
	url : "redis://localhost:6379",
	channels : "test",
	format : "raw"
}

class RedisInput extends Input {
	constructor(id,type) {
		super(id,type);
		this.paused = false;
	}

	configure(config,callback) {
		config = config || {};
		this.url = config.url || DEFAULTS.url;
		this.channels = config.channels || DEFAULTS.channels;
		this.format = FORMAT[config.format] || FORMAT.raw;

		if(!Array.isArray(this.channels))
			this.channels = [this.channels];

		callback();
	}

	get mode() {
		return Input.MODE.push;
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
		logger.info('Start input on redis endpoint', this.url);

		try {
			this.client = await this.connect();
			logger.info('Redis endpoint subscribed', this.channels);
		}catch(err) {
			return callback(err);
		}

		this.client.psubscribe(...this.channels,(err)=>{
			if(err) callback(err);
			else {
				this.client.on('pmessage',(pattern, channel, message)=>{
					if(this.paused) return;

					if(this.format==FORMAT.json) {
						try {message=JSON.parse(message)}catch(err){}
					}
					callback(null,{
						id : this.id,
						type : 'redis',
						channel : channel,
						originalMessage : message
					});
				});
			}
		});
	}

	stop(callback) {
		if(this.client)
			this.client.disconnect();
		callback();
	}

	pause(callback) {
		this.paused = true;
		callback();
	}

	resume(callback) {
		this.paused = false;
		callback();
	}
}

module.exports = RedisInput;
