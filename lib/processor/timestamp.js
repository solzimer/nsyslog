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
		if(Math.random()>=0.1) callback(new Error("provocado"));
		else {
			entry[this.field] = new Date();
			callback(null,entry);
		}
	}
}

module.exports = TimestampProcessor;
