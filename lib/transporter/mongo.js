const
	Transporter = require("./"),
	jsexpr = require("jsexpr"),
	extend = require("extend"),
	logger = require("../logger"),
	{timer} = require('../util'),
	Semaphore = require("../semaphore"),
	MongoClient = require("mongodb").MongoClient;

const nofn = entry=>entry;
const RETRY = 2000;
const DEF_CONF = {
	url : "mongodb://localhost:27017/test",
	collection : "nsyslog",
	interval : 100,
	batch : 1000,
	retry : true,
	maxRetry : Number.MAX_VALUE,
	maxPool : 5,
	options : {
		useUnifiedTopology: true,
		autoReconnect : true,
		reconnectTries : Number.MAX_VALUE
	}
};

class MongoSimpleTransporter extends Transporter {
	constructor(id,type) {
		super(id,type);
		this.connected = null;
	}

	async configure(config, callback) {
		this.config = config = extend(true,{},DEF_CONF, config || {});

		this.url = config.url || DEFAULTS.url;
		this.msg = config.format? jsexpr.expr(config.format) : nofn;
		this.indexes = config.indexes || [];
		this.options = config.options || {};
		this.cn = jsexpr.expr(config.collection);
		this.retry = config.retry;
		this.maxRetry = config.maxRetry;
		this.buffers = {};
		this.idxmap = {};
		this.sem = new Semaphore(config.maxPool||5);
		callback();
	}

	async connect() {
		let connected = false;

		while(!connected) {
			try {
				this.server = await MongoClient.connect(this.url,this.options);
				this.isConnected = true;
				this.server.on('close', () => {
					logger.warn(`${this.id}: MongoDB -> lost connection`,this.url);
					this.isConnected = false;
				});
				this.server.on('reconnect', () => {
					logger.warn(`${this.id}: MongoDB -> reconnect`,this.url);
					this.isConnected = true;
				});
				this.db = this.server.db();
				this.resume(()=>{});
				connected = true;
			}catch(err) {
				logger.error(`${this.id}: Cannot stablish connection to mongo (${this.url})`);
				logger.error(err);
				await timer(2000);
			}
		}
	}

	async createIndexes(col) {
		// Create indexes
		if(!this.idxmap[col]) {
			try {
				await Promise.all(this.indexes.map(idx=>{
					return this.db.collection(col).createIndex(idx);
				}));
				this.idxmap[col] = true;
				logger.debug(`${this.id}: Created indexes on collection ${col}`,this.indexes);
			}catch(err) {
				logger.error(`${this.id}: Error creating indexes on collection ${col}`);
				logger.error(err);
			}
		}
	}

	async insert(col, arr) {
		var msgs = arr.map(e=>e.msg);
		var cbs = arr.map(e=>e.callback);
		var inserted = false;
		var retries = this.maxRetry;

		// Insert data (Retry on error)
		await this.sem.take();
		while(!inserted) {
			try {
				if(!this.isConnected) throw new Error('Mongo connection lost');
				await this.db.collection(col).insertMany(msgs,this.options);
				cbs.forEach(callback=>callback());
				inserted = true;
			}catch(err) {
				logger.error(err);

				// Duplicate key error
				if(err.code==11000) {
					msgs.forEach(msg=>delete msg._id);
					await timer(RETRY);
				}
				else if(!this.retry) {
					cbs.forEach(callback=>callback(err));
					inserted = true;
				}
				else {
					retries--;
					if(!retries) {
						logger.error(`${this.id}: Reached max retries (${this.maxRetry}), aborting insertion`);
						cbs.forEach(callback=>callback(err));
						inserted = true;
					}
					else {
						await timer(RETRY);
					}
				}
			}
		}
		this.sem.leave();
	}

	async insertLoop(start) {
		let cfg = this.config, buffers = this.buffers;
		let all = [];

		if(start===false) {
			clearTimeout(this.ival);
			this.ival = null;
			return;
		}

		// Await for connection
		await this.connected;

		// For each collection
		Object.keys(buffers).forEach(async(col)=>{
			this.createIndexes(col);		// Create indexes
			let buffer = buffers[col];	// Get buffer for collection

			// While there are data in the collection
			while(buffer.length) {
				let arr = buffer.splice(0,cfg.batch);	// Get a batch of data
				all.push(this.insert(col,arr));				// Insert data
			}
		});

		await Promise.all(all);
		this.ival = setTimeout(()=>this.insertLoop(),cfg.interval);
	}

	start(callback) {
		this.connected = this.connect();
		if(callback) callback();
	}

	resume(callback) {
		this.insertLoop(true);
		if(callback) callback();
	}

	pause(callback) {
		this.insertLoop(false);
		if(callback) callback();
	}

	stop(callback) {
		this.insertLoop(false);
		if(this.server && this.server.close)
			this.server.close();
		this.connected = null;
		this.buffer = [];
		if(callback) callback();
	}

	transport(entry,callback) {
		let msg = this.msg(entry);
		if(typeof(msg)!=='object') msg = {data:msg};
		let col = this.cn(entry);

		// Remove invalid keys
		Object.keys(msg).forEach(k=>{
			if(k.startsWith("$")) delete msg[k];
		});

		if(!this.buffers[col])
			this.buffers[col] = [];

		this.buffers[col].unshift({msg,callback});
	}
}


class MongoTransporter extends Transporter {
	constructor(id,type) {
		super(id,type);
		this.connected = null;
		this.transporters = {}
	}

	async configure(config, callback) {
		this.config = config;
		this.url = jsexpr.expr(config.url);
		callback();
	}

	async sendCommand(cmd, callback) {
		let prall = Object.keys(this.transporters).map(url=>{
			return new Promise((ok,rej)=>{
				this.transporters[url][cmd]((err)=>err? rej(err) : ok());
			});
		});

		try {
			await Promise.all(prall);
			if(callback) callback();
		}catch(err) {
			if(callback) callback(err);
		}
	}

	start(callback) {
		if(callback) callback();
	}

	resume(callback) {
		return this.sendCommand('resume',callback);
	}

	pause(callback) {
		return this.sendCommand('pause',callback);
	}

	stop(callback) {
		return this.sendCommand('stop',callback);
	}

	async transport(entry,callback) {
		let url = this.url(entry);
		let config = extend({},this.config,{url});

		if(!this.transporters[url]) {
			let tr = new MongoSimpleTransporter(this.id, this.type);
			await new Promise(ok=>tr.configure(config,ok));
			await new Promise(ok=>tr.start(ok));
			this.transporters[url] = tr;
		}

		this.transporters[url].transport(entry, callback);
	}
}

module.exports = MongoTransporter;
