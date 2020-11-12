const
	HttpServer = require('./http'),
	HttpsServer = require('./https'),
	path = require('path'),
	extend = require('extend'),
	Input = require('../'),
	logger = require('../../logger'),
	URL = require('url');

const DEFAULTS = {
	url : "http://0.0.0.0:8080",
	format : 'json',
	ack : false,
	tls : {
		key: './config/server.key',
		cert: './config/server.crt',
		rejectUnauthorized : false
	}
};

class HttpServerInput extends Input {
	constructor(id,type) {
		super(id,type);
	}

	get mode() {
		return Input.MODE.push;
	}

	configure(config,callback) {
		config = config || {};
		let tlsoptions = extend({},DEFAULTS.tls,config.tls,{$path:config.$path});
		if(tlsoptions.customAuth) {
			try {
				let cAuth = require(path.resolve(config.$path,tlsoptions.customAuth));
				tlsoptions.customAuth = cAuth;
			}catch(err) {
				logger.error(`${this.id} Error setting custom TLS validation`,err);
			}
		}

		let url = URL.parse(config.url || DEFAULTS.url);
		switch(url.protocol) {
			case 'https:' :
				this.server = new HttpsServer(this.id, config.format,url.hostname,url.port,config.ack,tlsoptions);
				break;
			case 'http:' :
			default :
				this.server = new HttpServer(this.id, config.format,url.hostname,url.port,config.ack);
				break;
		}

		callback();
	}

	start(callback) {this.server.start(callback);}

	stop(callback) {this.server.stop(callback);}

	pause(callback) {this.server.pause(callback);}

	resume(callback) {this.server.resume(callback);}
}

module.exports = HttpServerInput;
