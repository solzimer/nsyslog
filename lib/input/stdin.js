const
	logger = require('../logger'),
	Input = require('./'),
	readline = require('readline');

const FORMAT = {
	raw : "raw",
	json : "json"
};

class StdinInput extends Input {
	constructor(id,type) {
		super(id,type);
		this.paused = false;
	}

	configure(config,callback) {
		config = config || {};
		this.format = FORMAT[config.format] || FORMAT.raw;
		callback();
	}

	get mode() {
		return Input.MODE.push;
	}

	start(callback) {
		this.rl = readline.createInterface({
		  input: process.stdin
		});

		this.rl.on('line',line=>{
			if(this.paused) return;
			this.send(line,callback);
		});
	}

	send(line, callback) {
		if(this.paused) return;

		if(this.format==FORMAT.json) {
			try {
				line = JSON.parse(line);
			}catch(err) {}
		}
		let entry = {originalMessage : line};
		callback(null,entry);
	}

	stop(callback) {
		this.rl.once('close',callback);
		this.rl.close();
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

module.exports = StdinInput;
