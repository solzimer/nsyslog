const EventEmiter = require('events');

class Component extends EventEmiter {
	constructor(id,type) {
		super();
		this.id = id;
		this.type = type;
	}

	configure(cfg,callback) {
		callback();
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

	key(entry) {
		return Object.keys(entry).filter(k=>{
			if(k.startsWith("@")) return false;
			if(k=="seq") return false;
			if(k=="type") return false;
			if(k=="originalMessage") return false;
			return true;
		}).sort().map(k=>data[k]).join("@");
	}
}

module.exports = Component;
