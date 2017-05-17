const
	Transform = require('stream').Transform;
	expression = require("../expression.js"),
	colors = require('colors');

colors.setTheme({
	prompt: 'white',
	info: 'green',
	warn: 'yellow',
	debug: 'cyan',
	error: 'red'
});

const FNVOID = function(){};
const DEF_CONF = {
	"format" : "${originalMessage}",
	"level" : "log"
}

class ConsoleTransporter extends Transform {
	constructor(config) {
		config = config || {};
		super(config);

		this.config = {};
		this.msg = expression.expr(config.format || DEF_CONF.format);
		this.level = config.level || DEF_CONF.level;
	}

	_transform(entry, encoding, callback) {
		var msg = this.msg(entry);
		switch(this.level) {
			case "info" : console.info(msg.info); break;
			case "debug" : console.log(msg.debug); break;
			case "log" : console.log(msg.prompt); break;
			case "warn" : console.warn(msg.warn); break;
			case "error" : console.error(msg.error); break;
			default : console.log(msg.prompt);
		}
		callback(null,entry);
	}
}

module.exports = ConsoleTransporter;
