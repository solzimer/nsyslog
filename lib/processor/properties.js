const Processor = require("./processor.js");

class PropertiesProcessor extends Processor {
	constructor(config) {
		super(config);
	}

	process(entry,callback) {
		callback(null,entry);
	}
}

module.exports = PropertiesProcessor;
