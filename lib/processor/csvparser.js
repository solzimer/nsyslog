const
	extend = require("extend"),
	Processor = require("./"),
	parse = require('csv-parse'),
	jsexpr = require("jsexpr");

class CSVParserProcessor extends Processor {
	constructor(id) {
		super(id);
	}

	configure(config,callback) {
		this.config = extend({},config);
		this.output = jsexpr.assign(this.config.output || "splitted");
		this.input = jsexpr.expr(this.config.input || "${originalMessage}");
		this.options = this.config.options || {};
		callback();
	}

	start(callback) {
		callback();
	}

	process(entry,callback) {
		let msg = this.input(entry);
		parse(msg, this.options, (err,res)=>{
			res = res || [];
			this.output(entry,res[0]);
			callback(err,entry);
		});
	}
}

module.exports = CSVParserProcessor;
