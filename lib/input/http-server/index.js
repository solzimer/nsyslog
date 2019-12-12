const
	HttpServer = require('./http'),
	HttpsServer = require('./https'),
	extend = require('extend'),
	Input = require('../'),
	URL = require('url');

const DEFAULTS = {
	url : "http://0.0.0.0:8080",
	format : 'json',
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

		let url = URL.parse(config.url || DEFAULTS.url);
		switch(url.protocol) {
			case 'https:' :
				this.server = new HttpsServer(config.format,url.hostname,url.port,tlsoptions);
				break;
			case 'http:' :
			default :
				this.server = new HttpServer(config.format,url.hostname,url.port);
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
