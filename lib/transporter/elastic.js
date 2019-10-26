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
}

/**
 * ElasticTransporter
 * @description Sends data to a ElasticSearch server / cluster
 * @class
 * @extends Transporter
 */
class ElasticTransporter extends Transporter {
	constructor(id,type) {
		super(id,type);
	}

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

	async start(callback) {
		callback();
	}

	resume(callback) {
		callback();
	}

	pause(callback) {
		callback();
	}

	close(callback) {
		callback();
	}

	key(entry) {
		return `${entry.id}:${entry.type}`
	}

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
