class Input {
	configure(cfg) {
	}

	get mode() {
		return MODE.push;
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
	push:"push",
	pull:"pull"
}


module.exports = Input;
