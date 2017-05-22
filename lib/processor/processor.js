class Processor {
	constructor(config) {
		this.configuration = config;
	}

	process(entry,callback) {
		entry.PROCESSED = true;
		callback(null,entry);
	}
}

module.exports = Processor;
