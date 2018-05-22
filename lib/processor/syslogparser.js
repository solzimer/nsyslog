const
	Processor = require("./"),
	parser = require("nsyslog-parser");

class SyslogParserProcessor extends Processor {
	constructor(id,sticky) {
		super(id,sticky);
		this.map = {};
		this.ival = null;
	}

	configure(config, callback) {
		this.field = config.field || "originalMessage";
		callback();
	}

	process(entry,callback) {
		let raw = entry[this.field];
		callback(null,parser(raw));
	}
}

module.exports = SyslogParserProcessor;
