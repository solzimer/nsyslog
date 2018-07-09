const
	Transporter = require("./"),
	expression = require("jsexpr"),
	extend = require("extend"),
	logger = require("../logger"),
	MongoClient = require("mongodb").MongoClient;

const nofn = entry=>entry;
const DEF_CONF = {
	url : "mongodb://localhost:27017/test",
	collection : "nsyslog",
	interval : 100,
	batch : 1000,
	ignoreErrors : false
}

class MongoTransporter extends Transporter {
	constructor(id) {
		super(id);
	}

	async configure(config, callback) {
		this.config = extend({},DEF_CONF,config);
		this.msg = config.format? expression.expr(config.format) : nofn;
		this.cn = this.config.collection;
		this.buffer = [];
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
		var cfg = this.config, buffer = this.buffer;

		var insfn = async()=>{
			while(buffer.length) {
				var arr = buffer.splice(0,cfg.batch);
				var msgs = arr.map(e=>e.msg);
				var cbs = arr.map(e=>e.callback);
				var inserted = false;
				while(!inserted) {
					try {
						await this.db.collection(this.cn).insertMany(arr);
						cbs.forEach(callback=>callback());
						inserted = true;
					}catch(err) {
						logger.error(err);
						if(this.ignoreErrors) {
							cbs.forEach(callback=>callback(err));
							inserted = true;
						}
						else await new Promise(ok=>setTimeout(ok,5000));
					}
				}
			}
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
		try {
			let msg = this.msg(entry);
			msg = this.json? JSON.parse(msg) : {data:msg};
			this.buffer.unshift({msg,callback});
		}catch(err) {
			callback(err);
		}
	}
}

module.exports = MongoTransporter;
