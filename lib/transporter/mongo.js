const
	Transporter = require("./"),
	jsexpr = require("jsexpr"),
	extend = require("extend"),
	logger = require("../logger"),
	MongoClient = require("mongodb").MongoClient;

const nofn = entry=>entry;
const RETRY = 5000;
const DEF_CONF = {
	url : "mongodb://localhost:27017/test",
	collection : "nsyslog",
	interval : 100,
	batch : 1000,
	retry : true
}

function timer(t) {
	return new Promise(ok=>setTimeout(ok,t));
}

class MongoTransporter extends Transporter {
	constructor(id) {
		super(id);
	}

	async configure(config, callback) {
		this.config = extend({},DEF_CONF,config);
		this.msg = this.config.format? jsexpr.expr(this.config.format) : nofn;
		this.indexes = this.config.indexes || [];
		this.cn = jsexpr.expr(this.config.collection);
		this.retry = this.config.retry
		this.buffers = {};
		this.idxmap = {};
		callback();
	}

	async start(callback) {
		let connected = false;
		var cfg = this.config, buffer = this.buffer;

		while(!connected) {
			try {
				this.db = await MongoClient.connect(this.config.url);
				connected = true;
				this.resume(callback);
			}catch(err) {
				logger.error(`Cannot stablish connection to mongo (${cfg.url})`);
				logger.error(err);
				await new Promise(ok=>setTimeout(ok,2000));
			}
		}
	}

	resume(callback) {
		var cfg = this.config, buffers = this.buffers;

		var insfn = async()=>{
			// For each collection
			let all = Object.keys(buffers).map(async(col)=>{
				// Create indexes
				if(!this.idxmap[col]) {
					try {
						await Promise.all(this.indexes.map(idx=>{
							return this.db.collection(col).createIndex(idx);
						}));
						this.idxmap[col] = true;
					}catch(err) {
						logger.error(err);
					}
				}

				// Get buffer for collection
				let buffer = buffers[col];

				// While there are data in the collection
				while(buffer.length) {
					// Get a batch of data
					var arr = buffer.splice(0,cfg.batch);
					var msgs = arr.map(e=>e.msg);
					var cbs = arr.map(e=>e.callback);
					var inserted = false;

					// Insert data (Retry on error)
					while(!inserted) {
						try {
							await this.db.collection(col).insertMany(msgs);
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
								await timer(RETRY);
							}
						}
					}
				}

				// Empty buffer, return
				return true;
			});

			await all;
			this.ival = setTimeout(()=>insfn(),cfg.interval);
		}

		insfn();
		callback();
	}

	pause(callback) {
		clearTimeout(this.ival);
		this.ival = null;
		callback();
	}

	close(callback) {
		clearTimeout(this.ival);
		this.ival = null;
		this.buffer = [];
		callback();
	}

	transport(entry,callback) {
		let msg = this.msg(entry);
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

module.exports = MongoTransporter;
