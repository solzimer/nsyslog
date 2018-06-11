const
	logger = require('../logger'),
	Input = require('./'),
	dgram = require('dgram');

const DEFAULTS = {
	host : "0.0.0.0",
	port : 514,
	protocol : "udp4"
}

class UDPServer extends Input {
	constructor(id) {
		super(id);
	}

	configure(config) {
		config = config || {};
		this.host = config.host || DEFAULTS.host;
		this.port = config.port || DEFAULTS.port;
		this.protocol = config.protocol || DEFAULTS.protocol;
		this.server = null;
		this.paused = false;
	}

	get mode() {
		return Input.MODE.push;
	}

	start(callback) {
		this.server = dgram.createSocket(this.protocol);
		var eserver = {protocol : this.protocol, port : this.port, interface : this.host};

		this.server.on('listening', ()=>{var address = this.server.address()});

		this.server.on('message', (message, remote)=>{
			if(this.paused) return;
			var entry = {
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
	}

	resume(callback) {
		this.paused = false;
	}
}

module.exports = UDPServer;
