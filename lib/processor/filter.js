const Processor = require("./");

class FilterProcessor extends Processor {
	constructor(id) {
		super(id);
	}

	process(entry,callback) {
		entry.level = 7;
		callback(null,entry);
	}
}

module.exports = FilterProcessor;
