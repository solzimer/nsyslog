class Processor  {
	constructor(config) {
		config = config || {};
		this.configuration = config;
	}

	process(entry,callback) {
		callback(null,entry);
	}
}

module.exports = Processor;
