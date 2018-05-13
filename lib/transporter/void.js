const Transporter = require("./");

class VoidTransporter extends Transporter {
	constructor(id) {
		super(id);
	}
}

module.exports = VoidTransporter;
