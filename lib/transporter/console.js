const
	expression = require("../expression.js"),
	colors = require('colors');

colors.setTheme({
	prompt: 'white',
	info: 'green',
	warn: 'yellow',
	debug: 'cyan',
	error: 'red'
});

const DEF_CONF = {
	"format" : "${originalMessage}",
	"level" : "log"
}
const FNVOID = function(){};

function ConsoleTransporter() {
	this.config = {};
	this.msg = function(entry){return entry.originalMessage};
	this.level = "log";
}

ConsoleTransporter.prototype.configure = function(config) {
	config = config || {};
	this.msg = expression.expr(config.format || DEF_CONF.format);
	this.level = config.level || DEF_CONF.level;
}

ConsoleTransporter.prototype.send = function(entry,callback) {
	callback = callback||FNVOID;

	var msg = this.msg(entry);
	switch(this.level) {
		case "info" : console.info(msg.info); break;
		case "debug" : console.log(msg.debug); break;
		case "log" : console.log(msg.prompt); break;
		case "warn" : console.warn(msg.warn); break;
		case "error" : console.error(msg.error); break;
		default : console.log(msg.prompt);
	}
	callback();
}

module.exports = ConsoleTransporter;
