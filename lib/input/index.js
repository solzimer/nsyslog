const EventEmiter = require('events');

class Input extends EventEmiter {
	constructor(id,type) {
		super();
		this.id = id;
		this.type = type;
	}

	configure(cfg,callback) {
		if(callback) callback();
	}

	get mode() {
		return MODE.push;
	}

	start(callback) {
		callback();
	}

	pause(callback) {
		callback();
	}

	resume(callback) {
		callback();
	}

	stop(callback) {
		callback();
	}

	next(callback) {

	}
}

Input.MODE = {
	push:"push",
	pull:"pull"
}


module.exports = Input;
