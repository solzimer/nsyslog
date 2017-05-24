class CorrelateProcessor {
	constructor(config) {
		this.config = config;
		this.init(config);
	}

	init(config) {

	}

	process(entry,callback) {
		if(entry.originalMessage.indexOf(" 404")>=0) {
			var msg = "A 404 error ocurred!";
			callback(null,{
				message : msg,
				originalMessage : entry.originalMessage
			});
		}
		else {
			callback();
		}
	}
}

module.exports = CorrelateProcessor;
