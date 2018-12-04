const
	Transporter = require('./'),
	expression = require("jsexpr"),
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

class ConsoleTransporter extends Transporter {
	constructor(id,type) {
		super(id,type);
	}

	configure(config, callback) {
		config = config || {};

		this.config = config;
		this.msg = expression.expr(config.format || DEF_CONF.format);
		this.level = config.level || DEF_CONF.level;

		if(callback) callback();
	}

	transport(entry, callback) {
		var msg = this.msg(entry);

		if(typeof(msg)!=="string")
			msg = JSON.stringify(msg);

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
