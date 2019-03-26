const
	Transporter = require('../../lib/nsyslog').Core.Transporter,
	jsexpr = require('jsexpr');

class MyTransporter extends Transporter {
	constructor(id) {
		super(id);
		this.count = 0;
	}

	configure(config,callback) {
		callback();
	}

	transport(entry, callback) {
		this.count++;
		if((this.count%100)==0)
			console.log(`Output => ${this.count}`);
		callback(null,entry);
	}
}

module.exports = MyTransporter;
