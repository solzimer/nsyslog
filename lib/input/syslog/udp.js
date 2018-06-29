const
	logger = require('../../logger'),
	dgram = require('dgram');

class UDPSyslog {
	constructor(protocol,host,port) {
		this.host = host;
		this.port = port;
		this.protocol = protocol;
		this.server = null;
		this.paused = false;
	}

	start(callback) {
		this.server = dgram.createSocket(this.protocol);
		var eserver = {protocol : this.protocol, port : this.port, interface : this.host};

		this.server.on('listening', ()=>{var address = this.server.address()});

		this.server.on('message', (message, remote)=>{
			if(this.paused) return;
			var entry = {
				timestamp : Date.now(),
				originalMessage : message.toString(),
				server : eserver,
				client : {address : remote.address}
			};
			callback(null,entry);
		});

		this.server.on("error", err => {
			logger.error(err);
			this.server.close();
			callback(err,null);
		});

		this.server.bind(this.port, this.host);
	}

	stop(callback) {
		this.server.close(callback);
	}

	pause(callback) {
		this.paused = true;
		callback();
	}

	resume(callback) {
		this.paused = false;
		callback();
	}
}

module.exports = UDPSyslog;
