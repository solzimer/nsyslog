const Processor = require("./");

class NullProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
	}

	process(entry,callback) {
		callback(null,entry);
	}
}

module.exports = NullProcessor;
