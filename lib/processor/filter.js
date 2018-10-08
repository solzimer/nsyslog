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
	output : "aggregate",
	aggregate : {
		"count" : 1
	}
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
		this.aggregate = jsexpr.expr(this.config.aggregate);
		this.first = this.config.first;

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
				this.buffer[key] = this.buffer[key] || {first:this.first,data:{},size:0};
				let buff = this.buffer[key];
				let aggr = this.aggregate(entry);
				
				buff.size++;
				Object.keys(aggr).forEach(k=>{
					buff.data[k] = buff.data[k]!==undefined? (buff.data[k]+aggr[k]) : aggr[k];
				});

				if(buff.first || buff.size>=this.every) {
					buff.first = false;
					this.output(entry,buff.data);
					buff.data = {};
					buff.size = 0;
					return callback(null,entry);
				}
				else {
					return callback(null);
				}

				break;
			case 'accept' :
			default :
				return callback(null, test? entry : null);
		}
	}
}

module.exports = FilterProcessor;
