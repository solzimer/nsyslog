class Processor  {
	constructor(id) {
		this.id = id;
	}

	get duplex() {
		return false;
	}

	configure(cfg, callback) {
		if(callback) callback();
	}

	start(callback) {
		if(callback) callback();
	}

	stop(callback) {
		if(callback) callback();
	}

	process(entry,callback) {
		callback(null,entry);
	}

	next(callback) {
		callback(null);
	}
}

module.exports = Processor;
