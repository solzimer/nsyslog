const dgram = require('dgram');

class UDPClient {
	constructor(host,port) {
		this.client = dgram.createSocket("udp4");
		this.host = host;
		this.port = port;
	}

	connect(callback) {
		callback();
	}

	close(callback) {
		callback();
	}

	send(msg, callback) {
		this.client.send(msg, 0, msg.length, this.port, this.host, callback);
	}
}

module.exports = UDPClient;
