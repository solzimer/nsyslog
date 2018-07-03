const
	extend = require("extend"),
	Processor = require("./");
	expression = require("jsexpr");

class SequenceProcessor extends Processor {
	constructor(id) {
		super(id);
	}

	configure(config,callback) {
		this.config = config;
		this.seq = config.start || 0;
		callback();
	}

	process(entry,callback) {
		entry.seq = this.seq++;
		callback(null,entry);
	}
}

module.exports = SequenceProcessor;
