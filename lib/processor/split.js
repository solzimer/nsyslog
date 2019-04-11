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
		this.map = this.config.map || null;
		if(this.map) {
			this.map = this.map.map(f=>jsexpr.assign(f));
		}
		callback();
	}

	start(callback) {
		callback();
	}

	process(entry,callback) {
		let val = `${this.input(entry)}`.split(this.separator);

		if(this.map) {
			let out = {};
			let map = this.map;
			let len = map.length;
			for(let i=0;i<len;i++) {
				this.map[i](out,val[i]);
			}
			this.output(entry,out);
		}
		else {
			this.output(entry,val);
		}

		callback(null,entry);
	}
}

module.exports = SplitProcessor;
