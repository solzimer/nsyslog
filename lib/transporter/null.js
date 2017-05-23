class NullTransporter  {
	constructor(config) {
	}

	transport(data, callback) {
		callback(null,data);
	}
}

module.exports = NullTransporter;
