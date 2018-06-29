const
	logger = require('../../logger'),
	UDPSyslog = require('./udp'),
	TCPSyslog = require('./tcp'),
	Input = require('../'),
	URL = require('url');

const DEFAULTS = {
	url : "udp4://0.0.0.0:514",
}

class SyslogServer extends Input {
	constructor(id) {
		super(id);
	}

	get mode() {
		return Input.MODE.push;
	}

	configure(config,callback) {
		config = config || {};
		let url = URL.parse(config.url || DEFAULTS.url);
		switch(url.protocol) {
			case 'udp6:':
				this.server = new UDPSyslog("udp6",url.hostname,url.port);
				break;
			case 'tcp:' :
			case 'tcp6:' :
				this.server = new TCPSyslog("tcp4",url.hostname,url.port);
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
