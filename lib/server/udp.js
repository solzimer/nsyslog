const
	dgram = require('dgram'),
	moment = require("moment");

const DEFAULTS = {
	host : "0.0.0.0",
	port : 514,
	protocol : "udp4"
}

function Server() {
	var host = DEFAULTS.host;
	var port = DEFAULTS.port;
	var protocol = DEFAULTS.protocol;
	var server = null;

	this.configure = function(config) {
		config = config || {};
		host = config.host || DEFAULTS.host;
		port = config.port || DEFAULTS.port;
		protocol = config.protocol || DEFAULTS.protocol;
	}

	this.start = function(callback) {
		server = dgram.createSocket(protocol);
		var eserver = {protocol : protocol, port : port, interface : host};

		server.on('listening', ()=>{var address = server.address()});
		server.on('message', (message, remote)=>{
			var entry = {
				originalMessage : message.toString(),
				server : eserver,
				client : {address : remote.address}
			};
			callback(entry);
		});
		server.on("error", err => {
			console.error(err);
			server.close();
		});
		server.bind(port, host);
	}

	this.stop = function(callback) {
		server.close(callback);
	}
}

module.exports = Server;
