const
	Transporter = require("./"),
	TLS = require("../tls"),
	jsexpr = require("jsexpr"),
	extend = require("extend"),
	logger = require("../logger"),
	request = require('request'),
	Semaphore = require('../semaphore');

const METHOD = {
	post : "post", put : "put",
	POST : "post", PUT : "put"
};

const DEF_CONF = {
	url : "http://localhost:3000",
	method : "post",
	format : "${originalMessage}",
	headers : {
		'Content-Type' : "application/json"
	},
	array : {
		enabled : false,
		max : 1000,
		ttl : 500
	},
	tls : TLS.DEFAULT
};

/**
 * HTTPTransporter is a transporter for sending log messages via HTTP or HTTPS.
 * 
 * @extends Transporter
 */
class HTTPTransporter extends Transporter {
	/**
	 * Creates an instance of HTTPTransporter.
	 * 
	 * @param {string} id - The unique identifier for the transporter.
	 * @param {string} type - The type of the transporter.
	 */
	constructor(id,type) {
		super(id,type);

		this.buffer = [];
		this.mutex = new Semaphore(1);
		this.ival = null;
	}

	/**
	 * Configures the transporter with the provided settings.
	 * 
	 * @param {Object} config - Configuration object for the transporter.
	 * @param {string} [config.url="http://localhost:3000"] - The URL to send log messages to.
	 * @param {string} [config.method="post"] - The HTTP method to use (e.g., "post", "put").
	 * @param {string} [config.format="${originalMessage}"] - The format of the log message.
	 * @param {Object} [config.headers] - HTTP headers to include in the request.
	 * @param {Object} [config.array] - Configuration for batch sending.
	 * @param {boolean} [config.array.enabled=false] - Whether to enable batch sending.
	 * @param {number} [config.array.max=1000] - Maximum number of messages per batch.
	 * @param {number} [config.array.ttl=500] - Time-to-live for batch messages in milliseconds.
	 * @param {Object} [config.tls=TLS.DEFAULT] - TLS options for secure connections.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config, callback) {
		this.config = config = extend(true,{},DEF_CONF,config);
		this.msg = jsexpr.expr(config.format);
		this.url = jsexpr.expr(config.url);
		this.hmethod = METHOD[config.method] || METHOD.post;
		this.headers = jsexpr.expr(config.headers);
		this.tlsopts = config.tls;
		this.istls = config.url.startsWith('https');
		this.opts = jsexpr.expr(config.options || {});
		this.array = config.array;

		if(this.istls) {
			this.tlsopts = await TLS.configure(this.tlsopts,config.$path);
		}

		this.agentOptions = extend({},this.istls? this.tlsopts:{});

		callback();
	}

	/**
	 * Starts the transporter.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async start(callback) {
		if(this.array.enabled && this.array.ttl>0) {
			this.trloop(this.array.ttl);
		}
		callback();
	}

	/**
	 * Resumes the transporter.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		callback();
	}

	/**
	 * Pauses the transporter.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		callback();
	}

	/**
	 * Closes the transporter.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	close(callback) {
		callback();
	}

	/**
	 * Generates a unique key for the log entry.
	 * 
	 * @param {Object} entry - The log entry.
	 * @returns {string} - The unique key for the entry.
	 */
	key(entry) {
		return `${entry.id}:${entry.type}`;
	}

	/**
	 * Sends a batch of log messages.
	 * 
	 * @param {number} ttl - Time-to-live for batch messages in milliseconds.
	 */
	async trloop(ttl) {
		await this.mutex.take();
		try {
			let urlmap = this.buffer.reduce((map,item)=>{
				let url = this.url(item.entry);
				if(!map[url]) map[url] = [];
				map[url].push(item);
				return map;
			},{});

			logger.silly(`${this.id}: Send to URLs`,Object.keys(urlmap));

			let all = Object.keys(urlmap).map(k=>{
				let items = urlmap[k];
				let entry = items[0].entry;
				let msg = items.map(item=>this.msg(item.entry));
				let options = extend(true,{},{
					method : this.hmethod,
					url : this.url(entry),
					headers : this.headers(entry),
					agentOptions : this.agentOptions,
					body : typeof(msg)=='string'? msg : JSON.stringify(msg)
				},this.opts(entry));

				return new Promise(ok=>{
					request[this.hmethod](options,(err)=>{
						logger.silly(`${this.id}: Sent ${msg.length} to ${options.url} => ${err==null}`);
						items.forEach(item=>item.callback(err));
						ok();
					});
				});
			});

			await Promise.all(all);

		} catch(err) {
			logger.error(err);
		}

		this.buffer = [];
		this.mutex.leave();
		if(ttl>0)
			this.ival = setTimeout(()=>this.trloop(ttl),ttl);
	}

	/**
	 * Transports a log entry via HTTP or HTTPS.
	 * 
	 * @param {Object} entry - The log entry to be transported.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async transport(entry,callback) {
		if(!this.array.enabled) {
			let msg = this.msg(entry);
			let options = extend(true,{},{
				method : this.hmethod,
				url : this.url(entry),
				headers : this.headers(entry),
				agentOptions : this.agentOptions,
				body : typeof(msg)=='string'? msg : JSON.stringify(msg)
			},this.opts(entry));

			request[this.hmethod](options,callback);
		}
		else {
			await this.mutex.take();
			this.buffer.push({entry,callback});
			this.mutex.leave();

			if(this.buffer.length>=this.array.max)
				this.trloop();
		}
	}
}

module.exports = HTTPTransporter;
