/**
 * Logger interface
 * @module logger
 */

const cluster = require('./cluster');
const winston = require("winston");
const extend = require('extend');
const MODULE = 'nsyslog-logger';

/**
 * Application logger
 * @class Logger
 * @type Logger
 */
class Logger {
	/**
	 * Creates a new logger instance from interface implementation
	 * @param  {object} other Object implementing Logger interface
	 * @return {module:logger~Logger} Logger instance
	 */
	static from(other) {
		let logger = new Logger();
		other = extend({},other);
		Object.keys(other).forEach(k=>{
			logger[k] = other[k];
		});
		return logger;
	}

	constructor() {}

	/**
	 * Use this logger instance
	 * @param {module:logger~Logger} newInstance Logger instance
	 */
	setInstance(newInstance) {}

	/**
	 * Sets file transport
	 * @param {object} opts File transport options
	 */
	setFileTransport(opts) {}

	/**
	 * Sets log level
	 * @param {string} level Log level (silly,debug,info,warn,error)
	 */
	setLevel(level) {}
	info() {}
	debug() {}
	trace() {}
	silly() {}
	log() {}
	error() {}
	warn() {}
	warning() {}
}

if(cluster.isMaster) {
	const path = require('path');
	require('winston-transport');
	require('winston-logrotate');

	const FTR_OPTS = {
		file: path.resolve('./log/nsyslog.log'),
		colorize: false,
		timestamp: true,
		json: false,
		size: '10m',
		keep: 5,
		compress: true
	};

	winston.level = 'info';
	instance = winston;

	cluster.on(MODULE,(child,module,msg)=>{
		try {
			instance[msg.cmd](...msg.args,`[child:${child.pid}]`);
		}catch(err) {
			instance.error(err);
		}
	});

	module.exports = Logger.from({
		setInstance(newInstance) {
			instance = newInstance
		},
		setFileTransport(opts) {
			winston.configure({
    		transports: [
      		new winston.transports.Rotate(Object.assign({},FTR_OPTS,opts))
    		]
  		});
		},
		setLevel(level) {
			instance.level = level;
		},
		info() {
			instance.info.apply(instance,arguments)
		},
		debug() {
			instance.debug.apply(instance,arguments)
		},
		trace() {
			instance.silly.apply(instance,arguments)
		},
		silly() {
			instance.silly.apply(instance,arguments)
		},
		log() {
			instance.log.apply(instance,arguments)
		},
		error() {
			instance.error.apply(instance,arguments)
		},
		warn() {
			instance.warn.apply(instance,arguments)
		},
		warning() {
			instance.warn.apply(instance,arguments)
		}
	});
}
else {
	var level = 'info';
	var ilevel = winston.levels[level];

	function send(cmd,args) {
		let cilevel = winston.levels[level];

		// Avoid send innecesary logs
		if(cilevel<=ilevel) {
			setImmediate(()=>{
				args = Array.from(args);
				process.send({module:MODULE,cmd,args});
			});
		}
	}

	module.exports = Logger.from({
		setInstance() {},
		setLevel(newlevel) {
			level = newlevel || level;
			ilevel = winston.levels[level];
		},
		info() {send('info',arguments);},
		debug() {send('debug',arguments);},
		trace() {send('silly',arguments);},
		silly() {send('silly',arguments);},
		log() {send('log',arguments);},
		error() {send('error',arguments);},
		warn() {send('warn',arguments);},
		warning() {send('warn',arguments);}
	});
}
