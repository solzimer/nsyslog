const
	logger = require('../../logger'),
	UDPSyslog = require('./udp'),
	TCPSyslog = require('./tcp'),
	TLSSyslog = require('./tls'),
	extend = require('extend'),
	Input = require('../'),
	URL = require('url');

const DEFAULTS = {
	url : "udp4://0.0.0.0:514",
	tls : {
		key: './config/server.key',
		cert: './config/server.crt',
		rejectUnauthorized : false
	}
}

class SyslogServer extends Input {
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
			case 'udp6:':
				this.server = new UDPSyslog("udp6",url.hostname,url.port);
				break;
			case 'tcp:' :
			case 'tcp4:' :
			case 'tcp6:' :
				this.server = new TCPSyslog("tcp",url.hostname,url.port);
				break;
			case 'tls:' :
			case 'tls4:' :
			case 'tls6:' :
				this.server = new TLSSyslog("tls",url.hostname,url.port,tlsoptions);
				break;
			case 'udp:' :
			case 'udp4:':
			default :
				this.server = new UDPSyslog("udp4",url.hostname,url.port);
				break;
		}
		callback();
	}

	start(callback) {this.server.start(callback);}

	stop(callback) {this.server.stop(callback);}

	pause(callback) {this.server.pause(callback);}

	resume(callback) {this.server.resume(callback);}
}

module.exports = SyslogServer;
