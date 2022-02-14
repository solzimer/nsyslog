const
	extend = require("extend"),
	Processor = require("./"),
	jsexpr = require("jsexpr");

class ArrayProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
	}

	configure(config,callback) {
		this.config = extend({},config);
		this.max = this.config.max || 1000;
		if(this.max<0) this.max = Infinity;
		this.timeout = this.config.timeout || 0;
		this.field = jsexpr.assign(this.config.field || "array");
		this.buffer = [];
		callback();
	}

	start(callback) {
		if(this.timeout>0) {
			this.ival = setInterval(()=>{
				this.send();
			},this.timeout);
		}
		callback();
	}

	send() {
		let arr = this.buffer.splice(0,this.max);
		let list = arr.map(el=>el.entry);
		let out = {};
		this.field(out,list);
		arr.forEach((el,i)=>{
			if(i==0) el.callback(null,out);
			else el.callback();
		});
	}

	process(entry,callback) {
		this.buffer.push({entry,callback});
		if(this.timeout<=0 && this.buffer.length>=this.max) {
			this.send();
		}
	}
}

module.exports = ArrayProcessor;
