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

function cj(json) {return colorize(json,{pretty:true});}
const DEF_CONF = {
	"format" : "${originalMessage}",
	"level" : "log",
	"json" : {
		"format" : false,
		"spaces" : 2,
		"color" : true
	}
};

/**
 * ConsoleTransporter is a transporter for logging messages to the console.
 * It supports different log levels and JSON formatting options.
 * 
 * @extends Transporter
 */
class ConsoleTransporter extends Transporter {
	/**
	 * Creates an instance of ConsoleTransporter.
	 * 
	 * @param {string} id - The unique identifier for the transporter.
	 * @param {string} type - The type of the transporter.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the transporter with the provided settings.
	 * 
	 * @param {Object} config - Configuration object for the transporter.
	 * @param {string} [config.format="${originalMessage}"] - The format of the log message.
	 * @param {string} [config.level="log"] - The log level (e.g., "info", "debug", "warn", etc.).
	 * @param {Object} [config.json] - JSON formatting options.
	 * @param {boolean} [config.json.format=false] - Whether to format the message as JSON.
	 * @param {number} [config.json.spaces=2] - Number of spaces for JSON indentation.
	 * @param {boolean} [config.json.color=true] - Whether to colorize the JSON output.
	 * @param {Function} callback - Callback function to signal completion.
	 */
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

	/**
	 * Transports a log entry to the console.
	 * 
	 * @param {Object} entry - The log entry to be transported.
	 * @param {Function} callback - Callback function to signal completion.
	 */
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
