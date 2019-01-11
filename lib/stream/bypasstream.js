const
	Component = require('../component'),
	logger = require('../logger'),
	Duplex = require("stream").Duplex,
	Transform = require("stream").Transform;

const MAX = 10000;
const SIR = 100;

class BypassStream extends Transform {
	constructor() {
		super({
			objectMode:true,
			highWaterMark:MAX
		});
		this.instance = {id:`Bypass_${Component.nextSeq()}`};
	}

	_transform(chunk,encondig,callback) {
		callback(null,chunk);
	}

	close(callback) {
		callback();
	}
}

module.exports = BypassStream;
