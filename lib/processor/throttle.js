const	Processor = require("./");

class ThrottleProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
		this.buffer = [];
		this.ival = null;
	}

	configure(config,callback) {
		this.config = config;
		this.timeout = parseInt(config.timeout||0);
		callback();
	}

	start(callback) {
		if(this.timeout) {
			this.ival = setInterval(()=>{
				let item = this.buffer.shift();
				if(item) {
					item.callback(null, item.entry);
				}
			},this.timeout);
		}
		callback();
	}

	stop(callback) {
		if(this.ival)
			clearInterval(this.ival);

		callback();
	}

	async process(entry,callback) {
		if(this.timeout) {
			this.buffer.push({entry,callback});
		}
		else {
			callback(null,entry);
		}
	}
}

module.exports = ThrottleProcessor;
