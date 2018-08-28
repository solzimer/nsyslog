const Input = require('../lib/nsyslog').Core.Input;

class MyPushInput extends Input {
	constructor(id) {
		super(id);
		this.paused = false;
		this.ival = null;
	}

	configure(config,callback) {
		config = config || {};
		this.interval = parseInt(config.interval) || 100;
		this.threshold = parseFloat(config.threshold) || 0.5;
		callback();
	}

	get mode() {
		return Input.MODE.push;
	}

	start(callback) {
		this.ival = setInterval(()=>{
			if(this.paused) return;

			let rnd = Math.random();
			if(rnd < this.threshold)
				callback(null,{originalMessage : `This is a push input: ${rnd}`});
			else
				callback(`Threshold error: ${rnd}`);
		}, this.interval);
	}

	stop(callback) {
		clearInterval(this.ival);
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
		return `${this.id}@mypush`;
	}
}

module.exports = MyPushInput;
