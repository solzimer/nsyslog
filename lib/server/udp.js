const
	dgram = require('dgram'),
	slparser = require("nsyslog-parser"),
	moment = require("moment");

const DEFAULTS = {
	host : "localhost",
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
			var entry = slparser(message.toString());
			entry.server = eserver;
			entry.client = {address : remote.address}
			callback(entry);
		});
		server.on("error", err => {server.close()});
		server.bind(port, host);
	}

	this.stop = function(callback) {

	}
}

module.exports = Server;
