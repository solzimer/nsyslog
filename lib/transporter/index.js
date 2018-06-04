class Transporter {
	constructor(id) {
		this.id = id;
	}

	configure(cfg, callback) {
		if(callback) callback();
	}

	start(callback) {
		if(callback) callback();
	}

	pause(callback) {
		if(callback) callback();
	}

	resume(callback) {
		if(callback) callback();
	}

	stop(callback) {
		if(callback) callback();
	}

	transport(entry, callback) {
		if(callback) callback(null,entry);
	}
}

module.exports = Transporter;
