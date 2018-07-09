const
	extend = require("extend"),
	Processor = require("./");
	expression = require("jsexpr");

class ArrayProcessor extends Processor {
	constructor(id) {
		super(id);
	}

	configure(config,callback) {
		this.config = extend({},config);
		this.max = this.config.max || 1000;
		this.timeout = this.config.timeout || 0;
		this.field = this.config.field || "array";
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
		arr.forEach((el,i)=>{
			if(i==0) el.callback(null,{[this.field]:list});
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
