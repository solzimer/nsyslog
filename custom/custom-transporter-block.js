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
		this.block = config.block || false;
		callback();
	}

	transport(entry, callback) {
		if(!this.block) {
			callback(null,entry);
		}
	}
}

module.exports = MyTransporter;
