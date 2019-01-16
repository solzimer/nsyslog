const
	Component = require('../component'),
	logger = require('../logger'),
	Duplex = require("stream").Duplex,
	Transform = require("stream").Transform;

const MAX = 10000;
const SIR = 100;

class BypassStream extends Transform {
	constructor(name) {
		super({
			objectMode:true,
			highWaterMark:MAX
		});
		this.instance = {id:name || `Bypass_${Component.nextSeq()}`};
		Component.handlePipe(this);
	}

	_transform(chunk,encondig,callback) {
		callback(null,chunk);
	}

	close(callback) {
		callback();
	}
}

module.exports = BypassStream;
