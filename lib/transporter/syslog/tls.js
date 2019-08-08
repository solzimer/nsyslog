const
	tls = require('tls'),
  logger = require('../../logger'),
  TLS = require('../../tls'),
  fs = require('fs-extra'),
  extend = require("extend");

class TLSClient {
  constructor(host,port,stream,options) {
    this.host = host;
    this.port = port;
    this.stream = stream || false;
    this.options = options;
    this.init = false;
    this.connected = false;
  }

  async connect(callback) {
    if(this.connected) return;

    if(!this.init) {
      try {
        let options = await TLS.configure(this.options);
        options.host = this.host;
        options.port = this.port;
        this.options = options;
        this.init = true;
      }catch(err) {
        logger.error(err);
        logger.warn(`TLS connection error on ${this.host}:${this.port}.`);
        throw err;
      }
    }

    while(!this.connected) {
      let err = await new Promise(ok=>{
        this.client = tls.connect(this.options,ok);
        this.client.on('error',ok);
				this.client.on('close',()=>this.connected=false);
      });
      if(!err) this.connected = true;
      else {
        logger.error(err);
        logger.warn(`TLS connection error on ${this.host}:${this.port}. Retry ${RETRY} ms.`);
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
			this.disconnect();

		callback();
	}
}

module.exports = TLSClient;
