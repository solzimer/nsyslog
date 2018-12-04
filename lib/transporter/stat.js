const
	logger = require("../logger"),
	Transporter = require('./');

class StatTransporter extends Transporter {
	constructor(id,type) {
		super(id,type);
	}

	configure(config, callback) {
		config = config || {};

		this.config = config;
		this.threshold = config.threshold || 1000;
		this.count = 0;
		if(callback) callback();
	}

	transport(entry, callback) {
		this.count++;

		if(this.count%this.threshold==0)
			logger.info(`Received ${this.count} messages`);

		callback(null,entry);
	}
}

module.exports = StatTransporter;
