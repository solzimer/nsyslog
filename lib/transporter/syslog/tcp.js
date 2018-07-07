const
	net = require('net'),
	logger = require('../../logger'),
	extend = require("extend");

const RETRY = 5000;

class TCPClient {
	constructor(host,port,stream) {
		this.client = null;
		this.host = host;
		this.port = port;
		this.stream = stream || false;
		this.connected = false;
	}

	async connect() {
		if(this.connected) return;
		while(!this.connected) {
			this.client = new net.Socket();
			let err = await new Promise(ok=>{
				this.client.connect(this.port,this.host,ok)
				this.client.on('error',ok);
			});
			if(!err) this.connected = true;
			else {
				logger.error(err);
				logger.warn(`TCP connection error on ${this.host}:${this.port}. Retry ${RETRY} ms.`);
				await new Promise(ok=>setTimeout(ok,RETRY));
			}
		}
	}

	disconnect() {
		this.client.destroy();
		this.connected = false;
	}

	close(callback) {
		if(this.stream) {
			this.client.destroy();
			this.connected = false;
		}
		callback();
	}

	async send(msg, callback) {
		let written = false;
		while(!written) {
			await this.connect();
			let err = await new Promise(ok=>this.client.write(msg,'utf-8',ok));
			if(!err) written = true;
			else logger.error(`Failed to send TCP message to ${this.host}:${this.port}. Retry ${RETRY} ms.`);
		}
		if(!this.stream)
			this.client.disconnect();
		callback();
	}
}

module.exports = TCPClient;
