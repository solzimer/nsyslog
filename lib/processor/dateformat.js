const
	Processor = require("./"),
	{date} = require('../util'),
	extend = require('extend'),
	jsexpr = require("jsexpr");

const DEF_CONF = {
	input : '${timestamp}',
	format : 'YYYY-MM-DD HH:mm:ss',
	output : 'date',
	fields : []
};

class DateformatProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
	}

	configure(config, callback) {
		this.config = extend(true,{},DEF_CONF,config);
		this.field = jsexpr.expr(this.config.field || this.config.input);
		this.format = this.config.format;
		this.output = jsexpr.assign(this.config.output);
		this.fields = this.config.fields.map(f=>{
			return {
				format : f.format,
				output : jsexpr.assign(f.output)
			};
		});
		this.flen = this.fields.length;
		callback();
	}

	process(entry,callback) {
		let ts = date(this.field(entry));
		let res = ts.format(this.format);
		this.output(entry,res);

		// extra fields
		let fields = this.fields, flen = this.flen;
		for(let i=0;i<flen;i++) {
			let f = fields[i];
			f.output(entry,ts.format(f.format));
		}

		callback(null,entry);
	}
}

module.exports = DateformatProcessor;
