class NullTransporter  {
	constructor(config) {
	}

	send(data, callback) {
		callback(null,data);
	}
}

module.exports = NullTransporter;
