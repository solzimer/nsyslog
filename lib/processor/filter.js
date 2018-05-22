const Processor = require("./");

class FilterProcessor extends Processor {
	constructor(id,sticky) {
		super(id,sticky);
	}

	process(entry,callback) {
		entry.level = 7;
		callback(null,entry);
	}
}

module.exports = FilterProcessor;
