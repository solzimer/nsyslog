const
	logger = require('../logger'),
	extend = require('extend'),
	request = require('request'),
	Watermark = require('../watermark'),
	Queue = require('../queue'),
	TLS = require('../tls'),
	Input = require('./'),
	jsexpr = require('jsexpr'),
	URL = require('url');

const DEFAULTS = {
	url : "http://localhost:9200",
	options : {},
	tls : {
		key: './config/server.key',
		cert: './config/server.crt',
		rejectUnauthorized : false
	}
}

class ElasticInput extends Input {
	constructor(id,type) {
		super(id,type);
	}

	get mode() {
		return Input.MODE.pull;
	}

	async configure(config,callback) {
		config = config || {};

		let url = URL.parse(config.url || DEFAULTS.url);
		let options = config.options;
		let tls = config.tls;

		switch(url.protocol) {
			case 'http:':
			case 'https:' :
				break;
			default :
				return callback(new Error(`Unknown protocol ${url.protocol}`));
		}

		if(tls) this.tls = await TLS.configure(tls,config.$path);
		this.url = `${config.url}/${config.index}/_search`;
		this.index = config.index;
		this.query = jsexpr.expr(config.query||{match:{}});
		this.from = config.from || 0;
		this.batchsize = config.batchsize || 100;
		this.options = options || {};
		this.ival = parseInt(config.interval) || null;
		this.options.agentOptions = tls? this.tls : {};
		this.queue = new Queue();
		this.watermark = new Watermark(config.$datadir);
		this.owm = config.watermark || {};

		await this.watermark.start();
		this.wm = await this.watermark.get(this.id);

		if(!this.wm[this.index]) {
			this.wm[this.index] = {last:this.owm};
		}

		await this.watermark.save(this.wm);

		this.reading = null;
		callback();
	}

	async fetch() {
		if(this.reading) return this.reading;

		let wm = this.wm[this.index];
		let last = wm.last;
		let body = JSON.stringify({query: this.query(last), size: this.batchsize});
		this.options.headers = this.options.headers || {};
		this.options.headers['Content-Type'] = "application/json";

		logger.silly('Elastic query',body);

		this.reading = new Promise((ok,rej)=>{
			extend(this.options,{body});
			request.get(this.url,this.options,async(err,res,body)=>{
				if(err) return rej(err);
				else if(res.statusCode!=200) return rej(body);
				try {
					body = JSON.parse(body);
					body.hits.hits.forEach(item=>this.queue.push(item._source));
					let newm = body.hits.hits.pop();
					if(newm) wm.last = newm._source;
					return ok();
				}catch(err) {
					return rej(err);
				}
			});
		}).then(()=>{
			this.reading = false;
			return this.watermark.save(this.wm);
		}).catch(err=>{
			logger.error(err);
			this.reading = false;
			return this.watermark.save(this.wm);
		});

		return this.reading;
	}

	async start(callback) {
		try {
			this.fetch();
			callback();
		}catch(err) {
			callback(err);
		}
	}

	async next(callback) {
		if(!this.queue.size()) {
			do {
				await this.fetch();
				if(!this.queue.size()) {
					await new Promise(ok=>setTimeout(ok,500));
				}
			}while(!this.queue.size());
		}
		try {
			let item = await this.queue.pop(1000);
			if(item.err)
				callback(item.err);
			else
				callback(null,{index: this.index, originalMessage: item});
		}catch(err) {
				callback(err);
		}
	}

	async stop(callback) {
		await this.watermark.save(this.wm);
		callback();
	}

	async pause(callback) {
		await this.watermark.save(this.wm);
		callback();
	}

	resume(callback) {
		callback();
	}

	key(entry) {
		return `${entry.input}:${entry.type}@${entry.url}`;
	}
}

module.exports = ElasticInput;
