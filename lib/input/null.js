const Input = require('./');

class NullInput extends Input {
	configure(config,callback) {
		callback();
	}

	get mode() {
		return Input.MODE.pull;
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
