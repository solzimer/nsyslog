const
	Transporter = require('../lib/nsyslog').Core.Transporter,
	jsexpr = require('jsexpr');

class MyTransporter extends Transporter {
	constructor(id) {
		super(id);
	}

	configure(config,callback) {
		config = config || {};
		this.format = jsexpr.expression(config.format);
		callback();
	}

	transport(entry, callback) {
		setTimeout(()=>{
			callback(null,entry);
		},10);
	}
}

module.exports = MyTransporter;
