const Transporter = require('./');

class NullTransporter extends Transporter {
	constructor(id,type) {
		super(id,type);
	}
}

module.exports = NullTransporter;
