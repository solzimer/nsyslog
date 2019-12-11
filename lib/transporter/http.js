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

class HTTPTransporter extends Transporter {
	constructor(id,type) {
		super(id,type);

		this.buffer = [];
		this.mutex = new Semaphore(1);
		this.ival = null;
	}

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

	async start(callback) {
		if(this.array.enabled && this.array.ttl>0) {
			this.trloop(this.array.ttl);
		}
		callback();
	}

	resume(callback) {
		callback();
	}

	pause(callback) {
		callback();
	}

	close(callback) {
		callback();
	}

	key(entry) {
		return `${entry.id}:${entry.type}`;
	}

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
