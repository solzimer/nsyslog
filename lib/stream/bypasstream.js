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
		this.idx = 0;
	}

	_transform(chunk,encondig,callback) {
		this.idx++;
		if(this.idx%SIR==0) {
			setImmediate(()=>{
				callback(null,chunk);
			});
		}
		else {
			callback(null,chunk);			
		}
	}
}

module.exports = BypassStream;
