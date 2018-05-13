const Transporter = require('./');

class NullTransporter extends Transporter {
	constructor(id) {
		super(id);
	}
}

module.exports = NullTransporter;
