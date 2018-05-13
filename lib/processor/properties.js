const
	extend = require("extend"),
	Processor = require("./");
	expression = require("../expression.js");

class PropertiesProcessor extends Processor {
	constructor(config) {
		super(config);
		this.config = config;
		this.json = expression.expr(JSON.stringify(config.set));
	}

	process(entry,callback) {
		var expr = JSON.parse(this.json(entry));

		entry = extend(true,entry,expr);

		callback(null,entry);
	}
}

module.exports = PropertiesProcessor;
