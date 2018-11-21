const
	Processor = require('../lib/nsyslog').Core.Processor,
	jsexpr = require('jsexpr');

class MyProcessor extends Processor {
	constructor(id) {
		super(id);
		this.paused = false;
		this.i = 0;
	}

	configure(config,callback) {
		config = config || {};
		callback();

		setInterval(()=>{
			this.push([
				{seq:this.i++},
				{seq:this.i++},
				{seq:this.i++},
				{seq:this.i++},
			]);
		},1000);
	}

	process(entry, callback) {
		callback(null);
	}
}

module.exports = MyProcessor;
