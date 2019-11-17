const
	Transporter = require('./'),
	extend = require('extend'),
	jsexpr = require("jsexpr"),
	colorize = require('json-colorizer'),
	colors = require('colors');

colors.setTheme({
	prompt: 'white',
	info: 'green',
	warn: 'yellow',
	debug: 'cyan',
	error: 'red'
});

function cj(json) {return colorize(json,{pretty:true})};
const FNVOID = function(){};
const DEF_CONF = {
	"format" : "${originalMessage}",
	"level" : "log",
	"json" : {
		"format" : false,
		"spaces" : 2,
		"color" : true
	}
}

class ConsoleTransporter extends Transporter {
	constructor(id,type) {
		super(id,type);
	}

	configure(config, callback) {
		config = extend(true,{},DEF_CONF,config);

		this.config = config;
		this.msg = jsexpr.expr(config.format || DEF_CONF.format);
		this.level = jsexpr.expr(config.level || DEF_CONF.level);
		this.jsonformat = jsexpr.eval(`${config.json.format}`);
		this.spaces = jsexpr.eval(`${config.json.spaces}`);
		this.color = jsexpr.eval(`${config.json.color}`);

		if(callback) callback();
	}

	transport(entry, callback) {
		var msg = this.msg(entry);
		var level = this.level(entry);

		if(typeof(msg)!=="string") {
			let jsf = this.jsonformat(msg);
			let spaces = this.spaces(msg);
			let color = this.color(msg);
			if(jsf && !color)	msg = JSON.stringify(msg,null,spaces);
			else if(jsf && color) msg = cj(msg);
			else msg = JSON.stringify(msg);
		}

		switch(level) {
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
