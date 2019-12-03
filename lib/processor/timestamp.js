const
	Processor = require("./"),
	extend = require('extend'),
	{date} = require('../util'),
	jsexpr = require("jsexpr");

class TimestampProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
	}

	configure(config, callback) {
		this.config = extend({},config);

		this.input = this.config.input? jsexpr.expr(this.config.input) : null;
		this.format = this.config.format || null;
		this.field = jsexpr.assign(this.config.field || this.config.output || "timestamp");
		this.unix = this.config.unix || false;
		callback();
	}

	process(entry,callback) {
		try {
			let ts = this.input?
				date(this.input(entry),this.format).toDate() :
				new Date();

			this.field(entry,this.unix? ts.getTime() : ts);
			callback(null,entry);
		}catch(err) {
			callback(err,entry);
		}
	}
}

module.exports = TimestampProcessor;
