const
	net = require('net'),
	logger = require('../../logger'),
	Semaphore = require('../../semaphore'),
	{timer} = require('../../util');

const RETRY = 5000;
const POOL = 10;

class TCPClient {
	constructor(host,port,stream,timeout) {
		this.client = null;
		this.host = host;
		this.port = port;
		this.timeout = timeout || 0;
		this.stream = stream || false;
		this.connected = false;
		this.streamSem = new Semaphore(1);
		this.poolSem = new Semaphore(POOL);
	}

	async newConnection() {
		let client = new net.Socket();
		await new Promise((ok,rej)=>{
			client.setTimeout(this.timeout);
			client.connect(this.port,this.host,ok);
			client.on('error',rej);
		});

		return client;
	}

	async connect() {
		if(this.connected) return;

		while(!this.connected) {
			try {
				this.client = await this.newConnection();
				this.client.on('close',()=>this.disconnect());
				this.client.on('timeout',()=>this.disconnect());
				logger.info(`TCP Client ${this.host}:${this.port} connected`);
				this.connected = true;
			}catch(err) {
				logger.error(err);
				logger.warn(`TCP connection error on ${this.host}:${this.port}. Retry ${RETRY} ms.`);
				await timer(RETRY);
			}
		}
	}

	disconnect(client) {
		client = client || this.client;
		if(client)
			client.destroy();
		this.connected = false;
	}

	close(callback) {
		if(this.stream) {
			if(this.client)
				this.client.destroy();
			this.connected = false;
		}
		callback();
	}

	async send(msg, callback) {
		let written = false;

		if(!this.stream) {
			await this.poolSem.take();
			while(!written) {
				let client = null;
				try {
					client = await this.newConnection();
					client.on('timeout',()=>this.disconnect(client));
					let err = await new Promise(ok=>client.write(msg,'utf-8',ok));
					if(!err) written = true;
					else throw err;
				}catch(err) {
					logger.error(`Failed to send TCP message to ${this.host}:${this.port}. Retry ${RETRY} ms.`,err);
					await new Promise(ok=>setImmediate(ok));
					if(client!=null) client.destroy();
					await timer(RETRY);
				}
				if(client!=null) {
					await new Promise(ok=>setImmediate(ok));
					client.destroy();
				}
			}
			this.poolSem.leave();
		}
		else {
			await this.streamSem.take();
			while(!written) {
				await this.connect();
				let err = await new Promise(ok=>this.client.write(msg,'utf-8',ok));
				if(!err) written = true;
				else {
					logger.error(`Failed to send TCP message to ${this.host}:${this.port}. Retry ${RETRY} ms.`,err);
					this.disconnect();
				}
			}
			this.streamSem.leave();
		}

		callback();
	}
}

module.exports = TCPClient;
