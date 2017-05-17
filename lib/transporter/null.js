const
	Transform = require('stream').Transform;

class NullTransporter extends Transform {
	constructor(options) {
		options = options || {}
		if(options.objectMode===undefined) options.objectMode = true;

		super(options);
	}

	_transform(data, encoding, callback) {
		callback(null,data);
	}
}

module.exports = NullTransporter;
