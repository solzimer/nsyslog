const
	Processor = require("./"),
	levelup = require('levelup'),
	leveldown = require('leveldown'),
	Semaphore = require('../semaphore'),
	Path = require('path'),
	extend = require("extend"),
	Watermark = require("../watermark"),
	jsexpr = require("jsexpr");

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
		this.sem = new Semaphore(1);
	}

	configure(config,callback) {
		let path = Path.resolve(config.$datadir,"filter",this.id);

		this.config = extend({},DEF_CONF,config);
		this.mode = MODE[this.config.mode] || MODE.accept;
		this.filter = jsexpr.eval(this.config.filter);
		this.key = jsexpr.expr(this.config.key);
		this.every = parseInt(this.config.every) || 1;
		this.output = jsexpr.assign(this.config.output);
		this.aggregate = jsexpr.expr(this.config.aggregate);
		this.first = this.config.first;
		this.maxbuff = this.config.buffer;
		this.store = new Watermark(path);


		callback();
	}

	async purgeMemory() {
		if(this.blen>this.maxbuff) {
			await this.store.saveall(this.buffer);
			this.buffer = {};
			this.blen = 0;
		}
	}

	async getItem(key) {
		if(!this.buffer[key]) {
			let item = await this.store.get(key);
			item = extend({first:this.first,data:{},size:0},item);
			this.buffer[key] = item;
			this.blen++;
		}
		return this.buffer[key];
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
				let buff = await this.getItem(key);

				buff.size++;
				Object.keys(aggr).forEach(k=>{
					buff.data[k] = buff.data[k]!==undefined? (buff.data[k]+aggr[k]) : aggr[k];
				});

				if(buff.first || buff.size>=this.every) {
					buff.first = false;
					this.output(entry,buff.data);
					buff.data = {};
					buff.size = 0;
					return callback(null,entry);
				}
				else {
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
