const
	logger = require('../logger'),
	Duplex = require("stream").Duplex;
	Transform = require("stream").Transform;

const MAX = 10000;
const SIR = 100;

class BypassStream extends Transform {
	constructor() {
		super({
			objectMode:true,
			highWaterMark:MAX
		});
	}

	_transform(chunk,encondig,callback) {
		callback(null,chunk);
	}
}

module.exports = BypassStream;
