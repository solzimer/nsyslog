const
	Writable = require('stream').Writable;

class NullTransporter extends Writable {
	constructor(options) {
		super(options);
	}

	_write(chunk, encoding, callback) {
		callback();
	}
}

module.exports = NullTransporter;
