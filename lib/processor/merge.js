const
	extend = require("extend"),
	Processor = require("./"),
	logger = require("../logger"),
	jsexpr = require("jsexpr");

class MergeProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
	}

	configure(config,callback) {
		this.config = config;
		this.fields = (config.fields || []).map(f=>jsexpr.expr(f));
		this.output = jsexpr.assign(config.output);
		this.deep = config.deep || false;
		this.del = (config.delete || []).map(f=>{
			return eval(`(function(){
				return function(entry) {
					delete entry.${f}
				}
			})()`);
		});

		callback();
	}

	process(entry,callback) {
		let shards = this.fields.map(f=>f(entry));

		if(this.deep) shards.unshift(true);
		this.output(entry,extend.apply(extend,shards));
		this.del.forEach(fn=>fn(entry));

		callback(null,entry);
	}
}

module.exports = MergeProcessor;
