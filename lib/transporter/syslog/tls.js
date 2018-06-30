const
	tls = require('tls'),
	fs = require('fs-extra'),
	extend = require("extend");

class TLSClient {
	constructor(host,port,stream,options) {
		this.host = host;
		this.port = port;
		this.stream = stream || false;
		this.options = options;
	}

	async connect(callback) {
		let options = this.options;

		try {
			options.key = await fs.readFile(options.key);
			options.cert = await fs.readFile(options.cert);
			options.host = this.host;
			options.port = this.port;
		}catch(err) {
			callback(err);
		}

		if(this.stream) {
			this.client = tls.connect(this.options,callback);
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
			this.client = tls.connect(this.options,(err)=>{
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

module.exports = TLSClient;
