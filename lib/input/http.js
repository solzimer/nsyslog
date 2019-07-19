const
	logger = require('../logger'),
	extend = require('extend'),
	request = require('request'),
	TLS = require('../tls'),
	Input = require('./'),
	URL = require('url');

const DEFAULTS = {
	url : "http://localhost",
	options : {},
	tls : {
		key: './config/server.key',
		cert: './config/server.crt',
		rejectUnauthorized : false
	}
}

class HTTPInput extends Input {
	constructor(id,type) {
		super(id,type);
	}

	get mode() {
		return this.ival? Input.MODE.push : Input.MODE.pull;
	}

	async configure(config,callback) {
		config = config || {};

		let tlsoptions = extend({},DEFAULTS.tls,config.tls);
		let url = URL.parse(config.url || DEFAULTS.url);
		let options = config.options;
		let tls = config.tls;

		switch(url.protocol) {
			case 'http:':
			case 'https:' :
				break;
			default :
				return callback(new Error(`Unknown protocol ${url.protocol}`));
		}

		if(tls) this.tls = await TLS.configure(tls);
		this.url = url;
		this.options = options || {};
		this.ival = parseInt(config.interval) || null;
		this.options.agentOptions = tls? this.tls : {};

		callback();
	}

	fetch() {
		return new Promise((ok,rej)=>{
			request.get(this.url,this.options,(err,res,body)=>{
				if(err){
					rej(err);
				}
				else {
					ok({
						headers : res.headers,
						httpVersion : res.httpVersion,
						url : this.url.href,
						statusCode : res.statusCode,
						originalMessage : body
					});
				}
			});
		});
	}

	start(callback) {
		if(this.ival) {
			this.timer = setInterval(async ()=>{
				try {
					let res = await this.fetch();
					callback(null,res);
				}catch(err) {
					callback(err);
				}
			},this.ival);
		}
		else {
			callback();
		}
	}

	async next(callback) {
		try {
			let res = await this.fetch();
			callback(null,res);
		}catch(err) {
			logger.error(err);
			callback(err);
		}
	}

	stop(callback) {
		if(this.timer) {
			clearInterval(this.timer);
		}
		callback();
	}

	pause(callback) {
		this.stop(callback);
	}

	resume(callback) {
		this.start(callback);
	}

	key(entry) {
		return `${entry.input}:${entry.type}@${entry.url}`;
	}
}

module.exports = HTTPInput;
