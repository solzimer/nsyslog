const Writable = require('stream').Writable;

class EndWriter extends Writable {
	constructor(options) {
		super({objectMode:true});
	}

	_write(entry,encoding,callback) {
		callback();
	}
}

module.exports = EndWriter;
