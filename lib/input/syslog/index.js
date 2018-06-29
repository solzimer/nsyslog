const
	logger = require('../../logger'),
	UDPSyslog = require('./udp'),
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
		if(url.protocol=='udp:' || url.protocol=='udp4:') {
			this.server = new UDPSyslog("udp4",url.hostname,url.port);
		}
		callback();
	}

	start(callback) {this.server.start(callback);}

	stop(callback) {this.server.stop(callback);}

	pause(callback) {this.server.pause(callback);}

	resume(callback) {this.server.resume(callback);}
}

module.exports = SyslogServer;
