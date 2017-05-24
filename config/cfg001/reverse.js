class ReverseTransport {
	constructor(config) {
		this.config = config;
		this.init(config);
	}

	init(config) {

	}

	transport(entry,callback) {
		var r = entry.originalMessage.split("").reverse().join("");
		console.log(r);
		callback(null,entry);
	}
}

module.exports = ReverseTransport;
