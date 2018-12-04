const Transporter = require("./");

class VoidTransporter extends Transporter {
	constructor(id,type) {
		super(id,type);
	}
}

module.exports = VoidTransporter;
