const
	extend = require("extend"),
	Processor = require("./"),
	logger = require("../logger"),
	jsexpr = require("jsexpr");

class PropertiesProcessor extends Processor {
	constructor(id) {
		super(id);
	}

	configure(config,callback) {
		this.config = config;
		this.expr = config.set? jsexpr.expr(config.set) : ()=>{};
		this.extend = config.extend!==false;
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
		if(this.extend)	{
			if(this.deep) entry = extend(true,entry,this.expr(entry))
			else entry = Object.assign(entry,this.expr(entry));
		}
		else {
			entry = this.expr(entry);
		}

		this.del.forEach(fn=>{
			try {
				fn(entry);
			}catch(err) {
				logger.warn(err);
			}
		});

		callback(null,entry);
	}
}

module.exports = PropertiesProcessor;
