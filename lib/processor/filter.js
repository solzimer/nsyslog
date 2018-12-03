const
	Processor = require("./"),
	levelup = require('levelup'),
	leveldown = require('leveldown'),
	Semaphore = require('../semaphore'),
	logger = require('../logger'),
	Path = require('path'),
	extend = require("extend"),
	Watermark = require("../watermark"),
	jsexpr = require("jsexpr");

const TTL_IVAL = 5000;
const MODE = {
	accept : "accept",
	reject : "reject",
	every : "every"
}

const DEF_CONF = {
	buffer : 1000,
	mode : MODE.accept,
	filter : "true",
	key : "'all'",
	every : 1,
	first : true,
	ttl : 0,
	output : "aggregate",
	aggregate : {
		"count" : 1
	}
}

class FilterProcessor extends Processor {
	constructor(id) {
		super(id);
		this.buffer = {};
		this.blen = 0;
		this.ttls = {};
		this.sem = new Semaphore(1);
		this.ttlival = null;
	}

	async configure(config,callback) {
		let spath = Path.resolve(config.$datadir,"filter",`${this.id}_store`);
		let tpath = Path.resolve(config.$datadir,"filter",`${this.id}_ttl`);

		this.config = extend({},DEF_CONF,config);
		this.mode = MODE[this.config.mode] || MODE.accept;
		this.filter = jsexpr.eval(this.config.filter);
		this.key = jsexpr.expr(this.config.key);
		this.ttl = Math.abs(parseInt(this.config.ttl)) || DEF_CONF.ttl;
		this.every = parseInt(this.config.every) || DEF_CONF.every;
		this.output = jsexpr.assign(this.config.output);
		this.aggregate = jsexpr.expr(this.config.aggregate);
		this.first = this.config.first;
		this.maxbuff = this.config.buffer;
		this.store = new Watermark(spath);
		this.ttlstore = new Watermark(tpath);

		await this.store.start();
		await this.ttlstore.start();
		
		callback();
	}

	async purgeMemory() {
		if(this.blen>this.maxbuff) {
			await this.store.saveall(this.buffer);
			this.buffer = {};
			this.blen = 0;
		}
	}

	async getItem(key,entry) {
		if(!this.buffer[key]) {
			let item = await this.store.get(key);
			item = extend({first:this.first,data:{},size:0,ts:Date.now()},item);
			item.entry = item.entry || entry;
			this.buffer[key] = item;
			this.blen++;
		}
		return this.buffer[key];
	}

	async updateTTL(buff) {
		var ttl = null;
		var key = buff.ttl;
		var isnew = false;

		await this.sem.take();

		// Round to 1 second
		if(!key) {
			key = buff.ttl = `${Math.floor(Date.now() / 1000.0) * 1000}`;

			if(!this.ttls[key]) {
				ttl = await this.ttlstore.get(key);
				this.ttls[key] = ttl;
			}
			else {
				ttl = this.ttls[key];
			}

			if(!ttl.items) ttl.items = [];
			ttl.items.push(buff._id);
		}

		this.sem.leave();
	}

	async loopTTL() {
		let ttls = [];
		let ids = [];
		let since = Date.now()-this.ttl;

		await this.sem.take();

		try {
			await this.ttlstore.saveall(this.ttls);
			await this.ttlstore.readStream({lt:`${since}`},(key,value)=>{
				ttls.push(key);
				ids = ids.concat(value.items||[]);
			});
			let buffs = await Promise.all(
				ids.map(id=>this.buffer[id] || this.store.get(id))
			);
			await this.ttlstore.removeall(ttls);
			await this.store.removeall(ids);
			ids.forEach(id=>delete this.buffer[id]);
			buffs.forEach(buff=>{
				let entry = buff.entry;
				let dts = Math.floor((Date.now() - buff.timestamp) / 1000) * 1000;
				extend(buff.data,{$dts:dts});
				this.output(entry,buff.data);
				this.push(entry);
			});
		}catch(err) {
			logger.error(err);
		}

		this.ttls = {};
		this.sem.leave();
		this.ttlival = setTimeout(()=>this.loopTTL(),TTL_IVAL);
	}

	async start(callback) {
		if(this.ttl) {
			this.ttlival = setTimeout(()=>this.loopTTL(),TTL_IVAL);
		}
		callback();
	}

	async stop(callback) {
		if(this.ttlival)
			clearInterval(this.ttlival);
		callback();
	}

	async process(entry,callback) {
		let test = this.filter(entry);
		let key = this.key(entry);

		await this.sem.take();
		await this.purgeMemory();
		this.sem.leave();

		switch(this.mode) {
			case MODE.reject :
				return callback(null, test? null : entry);
			case 'every' :
				if(!test) return callback(null);
				let aggr = this.aggregate(entry);
				let buff = await this.getItem(key,entry);

				buff.size++;
				Object.keys(aggr).forEach(k=>{
					buff.data[k] = buff.data[k]!==undefined? (buff.data[k]+aggr[k]) : aggr[k];
				});

				if(buff.first || buff.size>=this.every) {
					let dts = Math.floor((Date.now() - buff.timestamp) / 1000) * 1000;
					buff.first = false;
					extend(buff.data,{$dts:dts});
					this.output(entry,buff.data);
					buff.data = {};
					buff.size = 0;
					return callback(null,entry);
				}
				else {
					if(this.ttl)
						await this.updateTTL(buff);
					return callback(null);
				}

				break;
			case 'accept' :
			default :
				return callback(null, test? entry : null);
		}
	}
}

module.exports = FilterProcessor;
