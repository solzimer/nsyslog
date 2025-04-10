const
	Transporter = require('../'),
	UDPClient = require('./udp'),
	TCPClient = require('./tcp'),
	TLSClient = require('./tls'),
	TLSOpts = require('../../tls'),
	URL = require('url'),
	os = require('os'),
	{date} = require("../../util"),
	extend = require("extend"),
	jsexpr = require("jsexpr");

const FACILITY = {
	"kern":0, "user":1, "mail":2,
	"daemon":3, "auth":4, "syslog":5,
	"lpr":6, "news":7, "uucp":8,
	"cron":9, "authpriv":10,"ftp":11,
	"ntp":12, "security":13, "console":14,
	"solaris-cron":15, "local0":16, "local1":17,
	"local2":18, "local3":19, "local4":20,
	"local5":21, "local6":22, "local7":23
};

const LEVEL = {
	"emerg":0, "alert":1,	"crit":2,	"error":3,
	"warn":4, "notice":5,	"info":6,	"debug":7
};

const DEF_CONF = {
	"format" : "${originalMessage}",
	"level" : LEVEL.info,
	"facility" : FACILITY.user,
	"url" : "udp://localhost:514",
	"hostname" : os.hostname(),
	"application" : "localdomain",
	"tls" : TLSOpts.DEFAULT,
	"timeout" : 0
};

/**
 * SyslogTransporter is a transporter for sending log messages to a syslog server.
 * It supports UDP, TCP, and TLS protocols.
 * 
 * @extends Transporter
 */
class SyslogTransporter extends Transporter {
	/**
	 * Creates an instance of SyslogTransporter.
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
	 * @param {number|string} [config.level=LEVEL.info] - The log level (numeric or string).
	 * @param {number|string} [config.facility=FACILITY.user] - The syslog facility (numeric or string).
	 * @param {string} [config.url="udp://localhost:514"] - The URL of the syslog server.
	 * @param {string} [config.hostname=os.hostname()] - The hostname to include in the log message.
	 * @param {string} [config.application="localdomain"] - The application name to include in the log message.
	 * @param {Object} [config.tls=TLSOpts.DEFAULT] - TLS options for secure connections.
	 * @param {number} [config.timeout=0] - Timeout for TCP/TLS connections in milliseconds.
	 * @param {Object} [config.stream] - Optional stream for sending log messages.
	 * @param {string} [config.$path] - Path for resolving TLS options.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	configure(config, callback) {
		config = config || {};

		this.config = config;
		this.msg = jsexpr.expr(config.format || DEF_CONF.format);

		this.level = jsexpr.expr(`${config.level===undefined? DEF_CONF.level : config.level}`);
		this.facility = jsexpr.expr(`${config.facility===undefined? DEF_CONF.facility : config.facility}`);
		this.url = config.url || DEF_CONF.url;
		this.hostname = jsexpr.expr(config.hostname || DEF_CONF.hostname);
		this.application = jsexpr.expr(config.application || DEF_CONF.application);
		this.tlsoptions = extend({},DEF_CONF.tls,config.tls,{$path:config.$path});
		this.stream = config.stream || DEF_CONF.stream;
		this.timeout = config.timeout || DEF_CONF.timeout;

		callback();
	}

	/**
	 * Starts the transporter by initializing the appropriate client (UDP, TCP, or TLS).
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	start(callback) {
		let url = URL.parse(this.url);
		if(url.protocol.startsWith("udp")) {
			this.client = new UDPClient(url.hostname,url.port,this.stream);
		}
		else if(url.protocol.startsWith("tcp")) {
			this.client = new TCPClient(url.hostname,url.port,this.stream,this.timeout);
		}
		else if(url.protocol.startsWith("tls")) {
			this.client = new TLSClient(url.hostname,url.port,this.stream,this.timeout,this.tlsoptions);
		}
		callback();
	}

	/**
	 * Stops the transporter by closing the client connection.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		if(this.client) {
			this.client.close(callback);
			this.client = null;
		}
		else {
			callback();
		}
	}

	/**
	 * Transports a log entry to the syslog server.
	 * 
	 * @param {Object} entry - The log entry to be transported.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	transport(entry, callback) {
		let level = this.level(entry),
				facility = this.facility(entry),
				msg = this.msg(entry),
				hostname = this.hostname(entry),
				application = this.application(entry),
				datestr = date().format("MMM D HH:mm:ss");

		level = isNaN(parseInt(level))? (LEVEL[level]||DEF_CONF.level) : parseInt(level);
		facility = isNaN(parseInt(facility))? (FACILITY[facility]||DEF_CONF.facility) : parseInt(facility);
		let pri = facility * 8 + level;

		let message = `<${pri}>${datestr} ${hostname} ${application}: ${msg}`;

		this.client.send(message,err=>{
			callback(err,entry);
		});
	}
}

module.exports = SyslogTransporter;
