const
	logger = require('../logger'),
	extend = require('extend'),
	elastic = require('@elastic/elasticsearch'),
	Watermark = require('../watermark'),
	Queue = require('../queue'),
	TLS = require('../tls'),
	Input = require('./'),
	jsexpr = require('jsexpr');

const { Client } = elastic;
const COPTS = {
	maxRetries: 5,
	requestTimeout: 60000,
	sniffOnStart: true
};
const DEFAULTS = {
	url : "http://localhost:9200",
	tls : TLS.DEFAULT,
	options : {},
}

class ElasticInput extends Input {
	constructor(id,type) {
		super(id,type);
	}

	get mode() {
		return Input.MODE.pull;
	}

	async configure(config,callback) {
		this.config = config = extend(true,{},DEFAULTS,config);
		config.url = Array.isArray(config.url)? config.url : [config.url];

		this.url = config.url;
		this.options = extend({},config.options);
		this.istls = config.url.some(url=>url.startsWith('https'));
		this.index = jsexpr.expr(config.index);
		this.query = jsexpr.expr(config.query||{match:{}});
		this.batchsize = config.batchsize || 100;
		this.ival = parseInt(config.interval) || null;
		this.queue = new Queue();
		this.sort = config.sort;
		this.watermark = new Watermark(config.$datadir);
		this.owm = config.watermark || {};

		if(this.istls) {
			this.tls = await TLS.configure(config.tls,config.$path);
			this.options.agentOptions = this.tls;
		}

		let copts = extend(true,COPTS,config.options,{node:config.url,auth:config.auth,ssl:this.tls});
		this.client = new Client(copts);
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
		let query = {
			index : this.index(last),
			size : this.batchsize,
			body : {query:this.query(last),sort:this.sort}
		}
		logger.silly(`${this.id} Elastic query`,this.url,query);

		this.reading = new Promise((ok,rej)=>{
			this.client.search(query,async(err,res)=>{
				if(err) return rej(err);
				let body = res.body;
				body.hits.hits.forEach(item=>this.queue.push(item._source));
				let newm = body.hits.hits.pop();
				if(newm) wm.last = newm._source;
				return ok();
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
