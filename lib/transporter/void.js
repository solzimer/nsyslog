class VoidTransporter {
	constructor(config) {
	}

	send(data, callback) {
		callback();
	}
}

module.exports = VoidTransporter;
