class Input {
	configure(cfg) {
	}

	get mode() {
		return MODE.active;
	}

	start(callback) {
		callback();
	}

	stop(callback) {
		callback();
	}

	next(callback) {

	}
}

Input.MODE = {
	active:"active",
	pasive:"pasive"
}


module.exports = Input;
