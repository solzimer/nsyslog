const
	logger = require('../logger'),
	extend = require('extend'),
	request = require('request'),
	exec = require('child_process').exec,
	Input = require('./');

class CommandInput extends Input {
	constructor(id) {
		super(id);
	}

	get mode() {
		return this.ival? Input.MODE.push : Input.MODE.pull;
	}

	async configure(config,callback) {
		config = config || {};

		this.cmd = config.cmd;
		this.options = config.options;
		this.ival = parseInt(config.interval) || null;

		callback();
	}

	fetch() {
		return new Promise((ok,rej)=>{
			exec(this.cmd,this.options,(err,res)=>{
				if(err){
					rej(err);
				}
				else {
					ok({
						cmd : this.cmd,
						originalMessage : res
					});
				}
			});
		});
	}

	start(callback) {
		if(this.ival) {
			this.timer = setInterval(async ()=>{
				try {
					let res = await this.fetch();
					callback(null,res);
				}catch(err) {
					callback(err);
				}
			},this.ival);
		}
		else {
			callback();
		}
	}

	async next(callback) {
		try {
			let res = await this.fetch();
			callback(null,res);
		}catch(err) {
			logger.error(err);
			callback(err);
		}
	}

	stop(callback) {
		if(this.timer) {
			clearInterval(this.timer);
		}
		callback();
	}

	pause(callback) {
		this.stop(callback);
	}

	resume(callback) {
		this.start(callback);
	}

	key(entry) {
		return `${entry.input}:${entry.type}@${entry.cmd}`;
	}
}

module.exports = CommandInput;
