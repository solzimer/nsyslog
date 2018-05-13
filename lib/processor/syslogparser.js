const
	Processor = require("./"),
	parser = require("nsyslog-parser");

class SyslogParserProcessor extends Processor {
	constructor(config) {
		super(config);
		this.field = config.field || "originalMessage";
	}

	process(entry,callback) {
		let raw = entry[this.field];
		callback(null,parser(raw));
	}
}

module.exports = SyslogParserProcessor;
