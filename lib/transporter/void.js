class VoidTransporter {
	constructor(config) {
	}

	transport(data, callback) {
		callback();
	}
}

module.exports = VoidTransporter;
