const cluster = require('./cluster');
const winston = require("winston");
const extend = require('extend');
const MODULE = 'nsyslog-logger';

/**
 * Application logger
 * @class Logger
 * @description <p>NSyslog uses a logger abstraction interface to log messages. By default,
 * Logger class uses a Winston ({@link https://www.npmjs.com/package/winston}) basic instance.</p>
 * <p>The purpose of this class is to allow embedding applications to inject their logger
 * system into NSyslog, so both share the same logger implementation.</p>
 * <p>Additionally, Logger module creates two implementations when required: Master and Child;
 * Child logger implementation (obtained by child processes), redirects all log messages to Master
 * implementation.</p>
 *
 * @example
 * const logger = require('nsyslog/lib/logger');
 *
 * // change inner implementation
 * logger.setInstance({
 * 	debug(...msg) {
 * 		console.log.apply(console,msg);
 * 	}
 * 	....
 * });
 *
 * logger.warn('This is a warning message');
 */
class Logger {
	/**
	 * Creates a new logger instance from interface implementation
	 * @param  {object} other Object implementing Logger interface
	 * @return {Logger} Logger instance
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
	 * @param {Logger} newInstance Logger instance
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

	/**
	 * Logs info messages
	 * @param  {object} args Arguments
	 */
	info(...args) {}

	/**
	 * Logs debug messages
	 * @param  {object} args Arguments
	 */
	debug(...args) {}

	/**
	 * Logs silly messages
	 * @param  {object} args Arguments
	 */
	trace(...args) {}

	/**
	 * Logs silly messages
	 * @param  {object} args Arguments
	 */
	silly(...args) {}

	/**
	 * Logs messages
	 * @param {string} level Level name
	 * @param  {object} args Arguments
	 */
	log(level,...args) {}

	/**
	 * Logs error messages
	 * @param  {object} args Arguments
	 */
	error(...args) {}

	/**
	 * Logs warning messages
	 * @param  {object} args Arguments
	 */
	warn(...args) {}

	/**
 	 * Logs warning messages
 	 * @param  {object} args Arguments
 	 */
	warning(...args) {}
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

	/**
	 * @type {Logger}
	 */
	module.exports = Logger.from({
		setInstance(newInstance) {
			instance = newInstance;
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
			instance.info.apply(instance,arguments);
		},
		debug() {
			instance.debug.apply(instance,arguments);
		},
		trace() {
			instance.silly.apply(instance,arguments);
		},
		silly() {
			instance.silly.apply(instance,arguments);
		},
		log() {
			instance.log.apply(instance,arguments);
		},
		error() {
			instance.error.apply(instance,arguments);
		},
		warn() {
			instance.warn.apply(instance,arguments);
		},
		warning() {
			instance.warn.apply(instance,arguments);
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
				args = Array.from(args).map(arg=>(arg instanceof Error)? arg.message : arg);
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
