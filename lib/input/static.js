const
	Input = require('./');

class StaticInput extends Input {
	constructor(id,type) {
		super(id,type);
	}

	get mode() {
		return Input.MODE.pull;
	}

	async configure(config,callback) {
		config = config || {};

		this.loop = config.loop || false;
		this.lines = config.lines || [];
		this.wm = 0;

		callback();
	}

	start(callback) {
		callback();
	}

	async next(callback) {
		let wm = this.loop? this.wm % this.lines.length : this.wm;
		let line = this.lines[wm];
		this.wm++;
		if(line) {
			setImmediate(()=>callback(null,{originalMessage:line}));
		}
	}

	stop(callback) {
		callback();
	}

	pause(callback) {
		this.stop(callback);
	}

	resume(callback) {
		this.start(callback);
	}

	key(entry) {
		return `${entry.input}:${entry.type}`;
	}
}

module.exports = StaticInput;
