const
	logger = require('../logger'),
	extend = require('extend'),
	request = require('request'),
	Watermark = require('../watermark'),
	Queue = require('../queue'),
	jsexpr = require('jsexpr'),
	{timer,immediate} = require('../util'),
	TLS = require('../tls'),
	Input = require('./'),
	URL = require('url');

const DEFAULTS = {
	url : "http://localhost",
	options : {},
	tls : {
		key: './config/server.key',
		cert: './config/server.crt',
		rejectUnauthorized : false
	}
};

class HTTPInput extends Input {
	constructor(id,type) {
		super(id,type);
	}

	get mode() {
		return this.ival? Input.MODE.push : Input.MODE.pull;
	}

	async configure(config,callback) {
		this.config = config = extend(true,{},DEFAULTS,config);

		let url = URL.parse(config.url || 'false');
		let options = config.options;
		let tls = config.tls;

		switch(url.protocol) {
			case 'http:':
			case 'https:' :
				break;
			default :
				return callback(new Error(`Unknown protocol ${url.protocol}`));
		}

		if(tls) this.tls = await TLS.configure(tls, config.$path);
		this.url = jsexpr.expr(config.url || 'http://localhost');
		this.options = jsexpr.expr(options);
		this.method = jsexpr.expr(config.method || 'GET');
		this.ival = typeof(config.interval)=='string'? jsexpr.eval(config.interval) : (parseInt(config.interval) || null);
		this.options.agentOptions = tls? this.tls : {};
		this.queue = new Queue();
		this.watermark = new Watermark(config.$datadir);
		this.owm = config.watermark || {};

		await this.watermark.start();
		this.wm = await this.watermark.get(this.id);

		if(!this.wm.last) {
			this.wm.last = this.owm;
		}

		await this.watermark.save(this.wm);

		this.reading = null;
		callback();
	}

	fetch() {
		if(this.reading) return this.reading;

		let wm = this.wm;
		let last = wm.last;
		let options = this.options(last);
		let url = this.url(last);
		let method = this.method(last);

		options.url = options.url || url || 'http://localhost';
		options.method =options.method || method ||  'GET';

		logger.silly(`${this.id} http query`,url,options);

		this.reading = new Promise((ok,rej)=>{
			request(options,(error,res,body)=>{
				if(error) return rej(error);
				else if(res.statusCode!=200) return rej(body);
				else {
					let ctype = res.headers['content-type'];
					if(ctype && ctype.toLowerCase().startsWith('application/json')) {
						try {	body = JSON.parse(body); }catch(ex){ logger.warn(`${this.id}`,ex); }
					}
					if(!Array.isArray(body)) body = [body];
					body.forEach(b=>{
						wm.last = b;
						this.queue.push({
							headers : res.headers,
							httpVersion : res.httpVersion,
							url : this.url.href,
							statusCode : res.statusCode,
							originalMessage : b
						});
					});

					return ok();
				}
			});
		}).then(async(res)=>{
			await this.watermark.save(this.wm);
			this.reading = false;
			return res;
		}).catch((err)=>{
			logger.error(err);
			this.reading = false;
			throw err;
		});

		return this.reading;
	}

	start(callback) {
		if(this.ival) {
			var fnloop = async()=>{
				try {
					await this.fetch();
					while(this.queue.size()) {
						await immediate();
						callback(null,await this.queue.pop());
					}
				}catch(err) {
					logger.error(`${this.id} Error fetching data`,err);
				}
				let wm = this.wm;
				let last = wm.last;				
				let ival = typeof(this.ival)=='number'? ival : this.ival(last);
				logger.silly(`${this.id} next http query in ${ival} ms`);
				this.timer = setTimeout(()=>fnloop(),ival);
			};
			fnloop();
		}
		else {
			callback();
		}
	}

	async next(callback) {
		if(!this.queue.size()) {
			do {
				await this.fetch();
				if(!this.queue.size()) {
					await timer(500);
				}
			}while(!this.queue.size());
		}
		try {
			let item = await this.queue.pop(1000);
			callback(null,item);
		}catch(err) {
			callback(err);
		}
	}

	stop(callback) {
		if(this.timer) {
			clearInterval(this.timer);
		}
		callback();
	}

	pause(callback) {
		this.stop(callback);
	}

	resume(callback) {
		this.start(callback);
	}

	key(entry) {
		return `${entry.input}:${entry.type}@${entry.url}`;
	}
}

module.exports = HTTPInput;
