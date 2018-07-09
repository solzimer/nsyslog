const
	logger = require('../logger'),
	Input = require('./'),
	URL = require('url'),
	zmq = require('zeromq'),
	pullSocket = zmq.socket('pull'),
	subSocket = zmq.socket('sub');

const FORMAT = {
	raw : "raw",
	json : "json"
}

const DEFAULTS = {
	url : "tcp://localhost:6666",
	mode : "pull",
	channel : "_test_",
	format : "raw"
}

const MODES = {
	pull : "pull",
	sub : "sub"
}

class ZMQInput extends Input {
	constructor(id) {
		super(id);
	}

	configure(config,callback) {
		config = config || {};
		this.url = config.url || DEFAULTS.url;
		this.zmode = MODES[config.mode] || DEFAULTS.mode;
		this.channel = config.channel || DEFAULTS.channel;
		this.format = FORMAT[config.format] || DEFAULTS.format;
		this.sock = null;
		callback();
	}

	get mode() {
		return Input.MODE.push;
	}

	start(callback) {
		switch(this.zmode) {
			case MODES.sub :
				this.sock = subSocket;
				this.sock.connect(this.url);
				this.sock.subscribe(this.channel);
				this.sock.on('message', (topic, message)=>this.send(topic,message,callback))
				logger.info(`ZeroMQ Subscriber connected to ${this.url} => ${this.channel}`);
				break;
			case MODES.pull :
			default :
				this.sock = pullSocket;
				this.sock.connect(this.url);
				this.sock.on('message', (message)=>this.send(null,message,callback))
				logger.info(`ZeroMQ Subscriber connected to ${this.url} => ${this.channel}`);
				break;
		}
	}

	send(topic,msg,callback) {
		if(this.paused) return;

		msg = msg.toString();
		if(this.format==FORMAT.json) {
			try {
				msg = JSON.parse(msg);
			}catch(err) {}
		}
		let entry = {
			mode : this.zmode,
			url : this.url,
			originalMessage : msg,
		}
		if(topic) entry.topic = `${topic}`;
		callback(null,entry);
	}

	stop(callback) {
		this.sock.disconnect(this.url);
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
}

module.exports = ZMQInput;
