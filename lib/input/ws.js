const
	logger = require('../logger'),
	Input = require('./'),
	TLS = require('../tls'),
	extend = require('extend'),
	fs = require('fs-extra'),
	URL = require('url'),
	http = require('http'),
	https = require('https'),
	WebSocket = require('ws');

const FORMAT = {
	raw : "raw",
	json : "json"
}

class WebsocketInput extends Input {
	constructor(id,type) {
		super(id,type);
	}

	configure(config,callback) {
		config = config || {};
		this.config = config;
		this.format = FORMAT[config.format] || FORMAT.raw;
		this.url = config.url;
		this.options = extend({},config.tls);
		callback();
	}

	get mode() {
		return Input.MODE.push;
	}

	async start(callback) {
		let
			url = URL.parse(this.url),
			options = this.options;

		// TLS
		if(url.protocol.startsWith('wss')) {
			try {
				options = await TLS.configure(options,this.config.$path);
			}catch(err) {
				callback(err);
			}
			this.server = new https.createServer(options);
		}
		else {
			this.server = new http.createServer();
		}

		this.wss = new WebSocket.Server({server:this.server});
		this.wss.on('connection', (ws)=>{
			ws.on('message', msg=>{
				this.send(msg,callback);
			});
		});

		this.server.listen(url.port,url.hostname,err=>{
			if(err) callback(err);
		});
	}

	send(msg, callback) {
		if(this.paused) return;

		if(this.format==FORMAT.json) {
			try {
				msg = JSON.parse(msg);
			}catch(err) {}
		}
		let entry = {originalMessage : msg};
		callback(null,entry);
	}

	stop(callback) {
		callback();
	}

	pause(callback) {
		this.paused = true;
		callback();
	}

	resume(callback) {
		this.paused = false;
		callback();
	}

	key(entry) {
		return `${entry.input}:${entry.type}@${this.url}`;
	}
}

module.exports = WebsocketInput;
