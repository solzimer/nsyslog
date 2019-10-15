const
	extend = require("extend"),
	Processor = require("./"),
	logger = require("../logger"),
	jsexpr = require("jsexpr");

class JSONParserProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
	}

	configure(config,callback) {
		this.config = extend({},config);
		this.output = this.config.output? jsexpr.assign(this.config.output) : null;
		this.input = jsexpr.expr(this.config.input || "${originalMessage}");

		callback();
	}

	start(callback) {
		callback();
	}

	process(entry,callback) {
		let msg = this.input(entry);

		try {
			let res = JSON.parse(msg);

			if(this.output) {
				this.output(entry,res);
			}
			else {
				extend(entry,res);
			}

			callback(null,entry);
		}catch(err) {
			callback(err,null);
		}
	}
}

module.exports = JSONParserProcessor;
