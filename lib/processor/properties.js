const
	extend = require("extend"),
	Processor = require("./");
	expression = require("jsexpr");

class PropertiesProcessor extends Processor {
	constructor(id) {
		super(id);
	}

	configure(config,callback) {
		this.config = config;
		this.expr = expression.expr(config.set);
		callback();
	}

	process(entry,callback) {
		entry = extend(true,entry,this.expr(entry));
		callback(null,entry);
	}
}

module.exports = PropertiesProcessor;
