const
	extend = require("extend"),
	Processor = require("./"),
	jsexpr = require("jsexpr");

class SplitProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
	}

	configure(config,callback) {
		this.config = extend({},config);
		this.input = jsexpr.expr(this.config.input || '${originalMessage}');
		this.output = jsexpr.assign(this.config.output || "splitted");
		this.separator = this.config.separator || " ";
		callback();
	}

	start(callback) {
		callback();
	}

	process(entry,callback) {
		let val = `${this.input(entry)}`.split(this.separator);
		this.output(entry,val);
		callback(null,entry);
	}
}

module.exports = SplitProcessor;
