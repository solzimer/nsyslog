const
	Processor = require('../../lib/nsyslog').Core.Processor,
	jsexpr = require('jsexpr');

class MyProcessor extends Processor {
	constructor(id) {
		super(id);
		this.arr = [];
	}

	configure(config,callback) {
		config = config || {};
		setInterval(()=>{
			console.log('LEAK: ',this.arr.length);
		},1000);
		callback();
	}

	process(entry, callback) {
		this.arr.push(entry);
		callback(null, entry);
	}
}

module.exports = MyProcessor;
