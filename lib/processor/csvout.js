const
	extend = require("extend"),
	Processor = require("./"),
	stringify = require('csv-stringify'),
	logger = require("../logger"),
	jsexpr = require("jsexpr");

class CSVOutProcessor extends Processor {
	constructor(id) {
		super(id);
		this.workers = [];
		this.seq = 0;
	}

	configure(config,callback) {
		this.config = extend({},config);
		this.output = jsexpr.assign(this.config.output || "csvout");
		this.fields = (this.config.fields||[]).map(f=>jsexpr.expr(f));
		this.options = this.config.options || {};

		callback();
	}

	start(callback) {
		callback();
	}

	process(entry,callback) {
		let arr = this.fields.map(fn=>fn(entry));
		stringify([arr],this.options,(err,res)=>{
			this.output(entry,res);
			callback(err,entry);
		});
	}
}

module.exports = CSVOutProcessor;
