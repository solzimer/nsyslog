const
	Processor = require("./"),
	extend = require("extend"),
	jsexpr = require("jsexpr");

const MODE = {
	accept : "accept",
	reject : "reject",
	every : "every"
}

const DEF_CONF = {
	mode : MODE.accept,
	regex : "true",
	every : 1,
	first : true
}

class FilterProcessor extends Processor {
	constructor(id) {
		super(id);
	}

	configure(config,callback) {
		this.config = extend({},DEF_CONF,config);
		this.mode = MODE[this.config.mode] || MODE.accept;
		this.filter = jsexpr.eval(this.config.filter);
		this.every = parseInt(this.config.every) || 1;
		this.first = this.config.first;
		this.offset = 0;

		callback();
	}

	process(entry,callback) {
		let test = this.filter(entry);
		switch(this.mode) {
			case MODE.reject :
				return callback(null, test? null : entry);
			case 'every' :
				if(!test) return callback(null);
				this.buff = this.buff || [];
				this.buff.push(entry);
				let len = this.buff.length + this.offset;
				if(this.buff.length>=this.every) this.buff = [];
				if(len==this.every) return callback(null,entry);
				else return callback(null);
				break;
			case 'accept' :
			default :
				return callback(null, test? entry : null);
		}
	}
}

module.exports = FilterProcessor;
