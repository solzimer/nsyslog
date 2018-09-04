const
	Processor = require("./"),
	jsexpr = require("jsexpr");

class TimestampProcessor extends Processor {
	constructor(id) {
		super(id);
	}

	configure(config, callback) {
		this.field = jsexpr.assign(config.field || config.output || "timestamp");
		this.unix = config.unix || false;
		callback();
	}

	process(entry,callback) {
		this.field(entry,this.unix? Date.now() : new Date());
		callback(null,entry);
	}
}

module.exports = TimestampProcessor;
