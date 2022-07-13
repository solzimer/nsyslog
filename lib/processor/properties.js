const
	extend = require("extend"),
	Processor = require("./"),
	logger = require("../logger"),
	jsexpr = require("jsexpr");

class PropertiesProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
	}

	configure(config,callback) {
		this.config = config;
		this.expr = config.set? jsexpr.expr(config.set) : ()=>{};
		this.extend = config.extend!==false;
		this.deep = config.deep || false;
		this.del = (config.delete || []).map(f=>{
			return eval(`(function(){
				return function(entry) {
					entry.${f} = undefined;
				}
			})()`);
		});
		callback();
	}

	process(entry,callback) {
		try {
			if(this.extend)	{
				if(this.deep) entry = extend(true,entry,this.expr(entry));
				else entry = Object.assign(entry,this.expr(entry));
			}
			else {
				entry = this.expr(entry);
			}
	
			let dlen = this.del.length;
			if(dlen) {
				let dels = this.del;
				for(let i=0;i<dlen;i++) {
					dels[i](entry);
				}
			}
	
			callback(null,entry);
		}catch(err) {
			logger.error(`Component ${this.id} failed with error`,err);
			callback(err,entry);
		}
	}
}

module.exports = PropertiesProcessor;
