const
	Transform = require('stream').Transform;

class VoidTransporter extends Transform {
	constructor(options) {
		options = options || {}
		if(options.objectMode===undefined) options.objectMode = true;

		super(options);
	}

	_transform(data, encoding, callback) {
		callback();
	}
}

module.exports = VoidTransporter;
