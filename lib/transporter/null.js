/**
 * NullTransporter is a transporter implementation that performs no operations.
 * It serves as a placeholder or default transporter.
 */
const Transporter = require('./');

class NullTransporter extends Transporter {
	/**
	 * Constructs a NullTransporter instance.
	 * @param {string} id - The identifier for the transporter.
	 * @param {string} type - The type of the transporter.
	 */
	constructor(id, type) {
		super(id, type);
	}
}

module.exports = NullTransporter;
