const
	Processor = require('../../lib/nsyslog').Core.Processor,
	jsexpr = require('jsexpr');

class MyProcessor extends Processor {
	constructor(id) {
		super(id);
	}

	configure(config,callback) {
		callback();
		this.block = config.block || false;
		this.cpu = config.cpu || 0;
	}

	process(entry, callback) {
		if(!this.block) {
			if(this.cpu=='timer') {
				setTimeout(()=>callback(null,entry),Math.random()*1000);
			}
			else {
				let cpu = Math.floor(Math.random()*this.cpu);
				let res = 0;
				for(let i=0;i<cpu;i++)
					res += Math.sqrt(Math.random()*1000);
				entry.res = res;
				callback(null,entry);
			}
		}
		else {
			//callback(null,entry);
		}
	}
}

module.exports = MyProcessor;
