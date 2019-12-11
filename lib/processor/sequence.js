const Processor = require("./");

class SequenceProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
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
