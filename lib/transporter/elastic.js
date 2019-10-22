const
	Transporter = require("./"),
	TLS = require("../tls"),
	jsexpr = require("jsexpr"),
	extend = require("extend"),
	fs = require("fs-extra"),
	logger = require("../logger"),
	request = require('request'),
	URL = require('url');

const METHOD = {
	post : "post", put : "put",
	POST : "post", PUT : "put"
}

const DEF_CONF = {
	url : "http://localhost:3000",
	method : "post",
	format : "${originalMessage}",
	headers : {
		'Content-Type' : "application/json"
	},
	tls : TLS.DEFAULT
}

class ElasticTransporter extends Transporter {
	constructor(id,type) {
		super(id,type);
	}

	async configure(config, callback) {
		this.config = config = extend(true,{},DEF_CONF,config);
		this.msg = jsexpr.expr(config.format);
		this.url = jsexpr.expr(config.url);
		this.hmethod = METHOD[config.method] || METHOD.post;
		this.headers = jsexpr.expr(config.headers);
		this.tlsopts = config.tls;
		this.istls = config.url.startsWith('https');
		this.opts = jsexpr.expr(config.options || {});

		if(this.istls) {
			this.tlsopts = await TLS.configure(this.tlsopts,config.$path);
		}

		this.agentOptions = extend({},this.istls? this.tlsopts:{});

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

	transport(entry,callback) {
		let msg = this.msg(entry);
		let options = extend(true,{},{
			method : this.hmethod,
			url : this.url(entry),
			headers : this.headers(entry),
			agentOptions : this.agentOptions,
			body : typeof(msg)=='string'? msg : JSON.stringify(msg)
		},this.opts(entry));

		request[this.hmethod](options,callback);
	}
}

module.exports = ElasticTransporter;
