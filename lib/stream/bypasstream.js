const
	logger = require('../logger'),
	Duplex = require("stream").Duplex;
	Transform = require("stream").Transform;

const MAX = 10000;

class BypassStream extends Transform {
	constructor() {
		super({
			objectMode:true,
			highWaterMark:10000
		});
	}

	_transform(chunk,encondig,callback) {
		setImmediate(()=>{
			callback(null,chunk);
		});
	}
}

module.exports = BypassStream;
