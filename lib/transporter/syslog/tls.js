const
	tls = require('tls'),
	logger = require('../../logger'),
	TLS = require('../../tls'),
	Semaphore = require('../../semaphore'),
	{ timer } = require('../../util');

const RETRY = 5000;
const POOL = 10;

class TLSClient {
	constructor(host, port, stream, timeout, options) {
		this.client = null;
		this.host = host;
		this.port = port;
		this.timeout = timeout || 0;
		this.stream = (stream==true || stream=='stream')? true : false;
		this.options = options;
		this.init = false;
		this.connected = false;
		this.streamSem = new Semaphore(1);
		this.poolSem = new Semaphore(POOL);
		this.tlsSem = new Semaphore(1);
	}

	async initTLS() {
		await this.tlsSem.take();

		if(this.init) {
			this.tlsSem.leave();
			return this.options;
		}

		try {
			this.options = await TLS.configure(this.options, this.options.$path);
			this.options.host = this.host;
			this.options.port = this.port;
			this.init = true;
			this.tlsSem.leave();
			return this.options;
		} catch (err) {
			this.tlsSem.leave();
			logger.error(err);
			logger.warn(`TLS connection error on ${this.host}:${this.port}.`);
			throw err;
		}
	}

	async newConnection() {
		let options = await this.initTLS();
		let client = null;

		await new Promise((ok, rej) => {
			client = tls.connect(options, ok);
			client.setTimeout(this.timeout);
			client.on('error', rej);
		});

		return client;
	}

	async connect() {
		if (this.connected) return;

		while (!this.connected) {
			try {
				this.client = await this.newConnection();
				this.client.on('close', () => this.connected = false);
				this.client.on('timeout',()=>this.disconnect());
				logger.info(`TLS Client ${this.host}:${this.port} connected`);
				this.connected = true;
			}catch(err) {
				logger.error(err);
				logger.warn(`TLS connection error on ${this.host}:${this.port}. Retry ${RETRY} ms.`);
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
		if (this.stream) {
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
					logger.error(`Failed to send TLS message to ${this.host}:${this.port}. Retry ${RETRY} ms.`,err);
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
					logger.error(`Failed to send TLS message to ${this.host}:${this.port}. Retry ${RETRY} ms.`,err);
					this.disconnect();
				}
			}
			this.streamSem.leave();
		}

		callback();
	}
}

module.exports = TLSClient;
