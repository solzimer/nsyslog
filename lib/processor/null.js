const Processor = require("./processor.js");

class NullProcessor extends Processor {
	constructor(config) {
		super(config);
	}

	process(entry,callback) {
		callback(null,entry);
	}
}

module.exports = NullProcessor;
