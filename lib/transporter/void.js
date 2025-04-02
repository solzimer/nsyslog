/**
 * VoidTransporter is a transporter implementation that performs no operations.
 * It is similar to NullTransporter and serves as a placeholder or default transporter.
 */
const Transporter = require("./");

class VoidTransporter extends Transporter {
	/**
	 * Constructs a VoidTransporter instance.
	 * @param {string} id - The identifier for the transporter.
	 * @param {string} type - The type of the transporter.
	 */
	constructor(id, type) {
		super(id, type);
	}
}

module.exports = VoidTransporter;
