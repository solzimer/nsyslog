const
	Processor = require("./");

class TimestampProcessor extends Processor {
	constructor(id) {
		super(id);
	}

	configure(config, callback) {
		callback();
		this.field = this.field || "timestamp";
	}

	process(entry,callback) {
		entry[this.field] = new Date();
		callback(null,entry);
	}
}

module.exports = TimestampProcessor;
