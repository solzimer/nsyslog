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
		this.json = expression.expr(JSON.stringify(config.set));
		callback();
	}

	process(entry,callback) {
		var expr = JSON.parse(this.json(entry));

		entry = extend(true,entry,expr);

		callback(null,entry);
	}
}

module.exports = PropertiesProcessor;
