const
	Transporter = require("./"),
	TLS = require("../tls"),
	expression = require("jsexpr"),
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

class HTTPTransporter extends Transporter {
	constructor(id) {
		super(id);
	}

	async configure(config, callback) {
		this.config = extend(true,{},DEF_CONF,config);
		this.msg = expression.expr(this.config.format);
		this.url = this.config.url;
		this.hmethod = METHOD[this.config.method] || METHOD.post;
		this.headers = this.config.headers;
		this.tlsopts = this.config.tls;
		this.istls = this.url.startsWith('https');

		if(this.istls) {
			this.tlsopts = await TLS.configure(this.tlsopts);
		}
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
		let options = extend({},{
			method : this.hmethod,
			url : this.url,
			headers : this.headers,
			agentOptions : extend({},this.istls? this.tlsopts:{}),
			body : typeof(msg)=='string'? msg : JSON.stringify(msg)
		});

		request[this.hmethod](options,callback);
	}
}

module.exports = HTTPTransporter;
