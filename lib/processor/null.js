const Processor = require("./");

class NullProcessor extends Processor {
	constructor(id,sticky) {
		super(id,sticky);
	}

	process(entry,callback) {
		callback(null,entry);
	}
}

module.exports = NullProcessor;
