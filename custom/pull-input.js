const Input = require('../lib/nsyslog').Core.Input;

class MyPullInput extends Input {
	constructor(id) {
		super(id);
		this.paused = false;
	}

	configure(config,callback) {
		config = config || {};
		this.interval = parseInt(config.interval) || 100;
		this.threshold = parseFloat(config.threshold) || 0.5;
		callback();
	}

	get mode() {
		return Input.MODE.pull;
	}

	next(callback) {
		setTimeout(()=>{
			let rnd = Math.random();
			if(rnd < this.threshold)
				callback(null,{originalMessage : `This is a pull input: ${rnd}`});
			else
				callback(`Threshold error: ${rnd}`);
		}, this.interval);
	}

	key(entry) {
		return `${this.id}@mypush`;
	}
}

module.exports = MyPullInput;
