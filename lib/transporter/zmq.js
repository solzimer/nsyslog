const
	Transporter = require("./"),
	extend = require('extend'),
	expression = require("jsexpr"),
	logger = require('../logger'),
	URL = require('url'),
	zmq = require('zeromq'),
	pushSocket = zmq.socket('push'),
	pubSocket = zmq.socket('pub');

const MODES = {
	push : "push",
	pub : "pub"
}

const DEFAULTS = {
	url : "tcp://localhost:6666",
	mode : "push",
	channel : "_test_",
	format : "${originalMessage}"
}

class ZMQTransporter extends Transporter {
	constructor(id) {
		super(id);
	}

	configure(config, callback) {
		config = extend({},DEFAULTS,config);

		this.url = config.url;
		this.msg = expression.expr(config.format);
		this.channel = expression.expr(config.channel);
		this.zmode = config.mode;

		if(this.zmode==MODES.pub)
			this.socket = pubSocket.bind(this.url,callback);
		else
			this.socket = pushSocket.bind(this.url,callback);
	}

	transport(entry,callback) {
		let msg = this.msg(entry);

		if(typeof(msg)!='string')
			msg = JSON.stringify(msg);

		if(this.zmode==MODES.pub) {
			let channel = this.channel(entry);
			this.socket.send([channel,msg],null,callback);
		}
		else {
			this.socket.send(msg,null,callback);
		}
	}

	stop(callback) {
		this.socket.unbind(this.url,callback);
	}
}

module.exports = ZMQTransporter;
