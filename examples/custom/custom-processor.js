const
	Processor = require('../../lib/nsyslog').Core.Processor,
	jsexpr = require('jsexpr');

class MyProcessor extends Processor {
	constructor(id) {
		super(id);
		this.paused = false;
	}

	configure(config,callback) {
		config = config || {};
		this.filter = jsexpr.eval(config.filter);
		this.duplicate = jsexpr.eval(config.duplicate);
		callback();
	}

	process(entry, callback) {
		if(this.filter(entry)) {
			// Entry is filtered, so output nothing
			callback();
		}
		else if(this.duplicate(entry)) {
			// Entry can produce more than one output
			callback(null,[entry,entry]);
		}
		else {
			// Processors can be asynchronous
			setTimeout(()=>{
				entry.myProcess = 'nothing done';
				callback(null,entry);
			},100);
		}
	}
}

module.exports = MyProcessor;
