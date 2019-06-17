const
	Processor = require("./"),
	Semaphore = require("../semaphore");

class ThrottleProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
		this.sem = new Semaphore(1);
	}

	configure(config,callback) {
		this.config = config;
		this.timeout = parseInt(config.timeout||0);
		callback();
	}

	async process(entry,callback) {
		if(this.timeout) {
			await this.sem.take();
			setTimeout(()=>{
				this.sem.leave();
				callback(null,entry);
			},this.timeout);
		}
		else {
			callback(null,entry);
		}
	}
}

module.exports = ThrottleProcessor;
