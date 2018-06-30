const
	net = require('net'),
	extend = require("extend");

class TCPClient {
	constructor(host,port,stream) {
		this.client = new net.Socket();
		this.host = host;
		this.port = port;
		this.stream = stream || false;
	}

	connect(callback) {
		if(this.stream) {
			this.client.connect(this.port,this.host,callback);
		}
		else {
			callback();
		}
	}

	close(callback) {
		if(this.stream) {
			this.client.destroy();
		}
		callback();
	}

	send(msg, callback) {
		if(!this.stream) {
			this.client.connect(this.port,this.host,(err)=>{
				if(err) return callback(err);
				this.client.write(msg,(err)=>{
					this.client.destroy();
					callback(err);
				});
			});
		}
		else {
			this.client.write(msg,callback);
		}
	}
}

module.exports = TCPClient;
