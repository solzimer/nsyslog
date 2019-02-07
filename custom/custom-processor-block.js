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
	}

	process(entry, callback) {
		if(!this.block)
			callback(null,entry);
	}
}

module.exports = MyProcessor;
