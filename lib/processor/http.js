const
	Processor = require("./"),
	TLS = require("../tls"),
	jsexpr = require("jsexpr"),
	extend = require("extend"),
	logger = require("../logger"),
	request = require('request');

const METHOD = {
	post : "post", put : "put", get : "get",
	POST : "post", PUT : "put", GET : "get"
};

const DEF_CONF = {
	url : "http://localhost:3000",
	method : "post",
	format : "${originalMessage}",
	headers : {
		'Content-Type' : "application/json"
	},
	tls : TLS.DEFAULT
};

class HTTPProcessor extends Processor {
	constructor(id,type) {
		super(id,type);

		this.buffer = [];
		this.ival = null;
	}

	async configure(config, callback) {
		this.config = config = extend(true,{},DEF_CONF,config);
		this.msg = jsexpr.expr(config.input||"${originalMessage}");
		this.format = jsexpr.expr(config.format||"${body}");
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
		return `${entry.id}:${entry.type}`;
	}

	async process(entry,callback) {
		let msg = this.msg(entry);
		let options = extend(true,{},{
			method : this.hmethod,
			url : this.url(entry),
			headers : this.headers(entry),
			agentOptions : this.agentOptions,
			body : typeof(msg)=='string'? msg : JSON.stringify(msg)
		},this.opts(entry));

		request[this.hmethod](options,(err, res, body)=>{
			let data = this.format({err,res,body});
			extend(true,entry,data);
			callback(null, entry);
		});
	}
}

module.exports = HTTPProcessor;
