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
		this.extend = config.extend!==false;
		this.deep = config.deep || false;
		callback();
	}

	process(entry,callback) {
		if(this.extend)	entry = extend(this.deep,entry,this.expr(entry));
		else entry = this.expr(entry);

		callback(null,entry);
	}
}

module.exports = PropertiesProcessor;
