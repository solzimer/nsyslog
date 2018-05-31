const Processor = require("./");

class NullProcessor extends Processor {
	constructor(id) {
		super(id);
	}

	process(entry,callback) {
		callback(null,entry);
	}
}

module.exports = NullProcessor;
