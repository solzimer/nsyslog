const Input = require('../../lib/nsyslog').Core.Input;

class MyPullInput extends Input {
	constructor(id) {
		super(id);
		this.paused = false;
		this.count = 0;
	}

	configure(config,callback) {
		config = config || {};
		this.interval = parseInt(config.interval) || 0;
		this.threshold = parseFloat(config.threshold) || 0.5;
		callback();
	}

	get mode() {
		return Input.MODE.pull;
	}

	next(callback) {
		if(this.interval) {
			setTimeout(()=>{
				let rnd = Math.random();
				if(rnd < this.threshold)
					callback(null,{originalMessage : `This is a pull input: ${rnd}`,interval:this.interval, seq:this.count++, pid:process.pid});
				else
					callback(`Threshold error: ${rnd}`);
			}, this.interval);
		}
		else {
			setImmediate(()=>{
				let rnd = Math.random();
				if(rnd < this.threshold)
					callback(null,{originalMessage : `This is a pull input: ${rnd}`, seq:this.count++, pid:process.pid});
				else
					callback(`Threshold error: ${rnd}`);
			});
		}
	}

	key(entry) {
		return `${this.id}@mypush`;
	}
}

module.exports = MyPullInput;
