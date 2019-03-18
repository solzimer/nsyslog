const
	Processor = require('../lib/nsyslog').Core.Processor,
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

			for(let i=0;i<this.cpu;i++)
				Math.sqrt(Math.random()*1000);

			callback(null,entry);
		}
	}
}

module.exports = MyProcessor;
