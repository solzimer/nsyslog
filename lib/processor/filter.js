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
	filter : "true",
	key : "'all'",
	every : 1,
	first : true,
	output : "$count"
}

class FilterProcessor extends Processor {
	constructor(id) {
		super(id);
		this.buffer = {};
	}

	configure(config,callback) {
		this.config = extend({},DEF_CONF,config);
		this.mode = MODE[this.config.mode] || MODE.accept;
		this.filter = jsexpr.eval(this.config.filter);
		this.key = jsexpr.expr(this.config.key);
		this.every = parseInt(this.config.every) || 1;
		this.output = jsexpr.assign(this.config.output);
		this.first = this.config.first;
		this.offset = 0;

		callback();
	}

	process(entry,callback) {
		let test = this.filter(entry);
		let key = this.key(entry);

		switch(this.mode) {
			case MODE.reject :
				return callback(null, test? null : entry);
			case 'every' :
				if(!test) return callback(null);
				this.buffer[key] = this.buffer[key] || {first:this.first,data:[]};
				let buff = this.buffer[key];

				if(buff.first) {
					buff.first = false;
					this.output(entry,1);
					return callback(null,entry);
				}
				else {
					buff.data.push(entry);
					let len = buff.data.length + this.offset;
					if(buff.data.length>=this.every) buff.data = [];
					if(len==this.every) {
						this.output(entry,len);
						return callback(null,entry);
					}
					else {
						return callback(null);
					}
				}

				break;
			case 'accept' :
			default :
				return callback(null, test? entry : null);
		}
	}
}

module.exports = FilterProcessor;
