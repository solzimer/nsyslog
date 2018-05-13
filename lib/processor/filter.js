const Processor = require("./");

class FilterProcessor extends Processor {
	constructor(config) {
		super(config);
	}

	process(entry,callback) {
		entry.level = 7;
		callback(null,entry);
	}
}

module.exports = FilterProcessor;
