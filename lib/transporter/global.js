const
	Transporter = require('.'),
	extend = require('extend'),
	Shm = require('../shm'),
	logger = require('../logger'),
	jsexpr = require("jsexpr");

const DEF_CONF = {
	"input" : "${originalMessage}",
	"output" : "nsyslog"
};

/**
 * Initializes the global shared memory and sets up event listeners for shared memory updates.
 */
function initialize() {
	const OUTCACHE = {};
	global._ = global._ || {};	

	Shm.shm.on('hset',(parent,key,value)=>{
		if(parent!='global') return;
		if(!OUTCACHE[key]) {
			OUTCACHE[key] = jsexpr.assign(key);
		}
		OUTCACHE[key](global._, value);
		logger.silly("SHM HSET",{parent,key,value});
	});
	
	Shm.shm.on('init',data=>{
		if(data['global']) {
			global._ = data.global;
			logger.silly('SHM INIT',global._);
		}
	});	
}

/**
 * GlobalTransporter is a transporter for storing log messages in a global shared memory.
 * 
 * @extends Transporter
 */
class GlobalTransporter extends Transporter {
	/**
	 * Creates an instance of GlobalTransporter.
	 * 
	 * @param {string} id - The unique identifier for the transporter.
	 * @param {string} type - The type of the transporter.
	 */
	constructor(id,type) {
		super(id,type);
	}

	/**
	 * Configures the transporter with the provided settings.
	 * 
	 * @param {Object} config - Configuration object for the transporter.
	 * @param {string} [config.input="${originalMessage}"] - The input expression for the log message.
	 * @param {string} [config.output="nsyslog"] - The key in the global shared memory where the message will be stored.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	configure(config, callback) {
		config = extend(true,{},DEF_CONF,config);

		this.config = config;
		this.input = jsexpr.expr(config.input || DEF_CONF.input);
		this.output = jsexpr.assign(config.output || DEF_CONF.output);
		this.outkey = config.output || DEF_CONF.output;

		if(callback) callback();
	}

	/**
	 * Transports a log entry by storing it in the global shared memory.
	 * 
	 * @param {Object} entry - The log entry to be transported.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	transport(entry, callback) {
		var msg = this.input(entry);
		this.output(global._, msg);
		Shm.hset('global',this.outkey,msg);
		callback(null,entry);
	}
}

initialize();
module.exports = GlobalTransporter;
