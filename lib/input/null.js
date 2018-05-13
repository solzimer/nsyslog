const Input = require('./');

class NullInput extends Input {
	configure(config) {
	}

	get mode() {
		return Input.MODE.active;
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

module.exports = NullInput;
