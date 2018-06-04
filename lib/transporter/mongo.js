const
	Transporter = require("./"),
	expression = require("../expression.js"),
	extend = require("extend"),
	logger = require("../logger"),
	MongoClient = require("mongodb").MongoClient;

const nofn = entry=>entry;
const DEF_CONF = {
	url : "mongodb://localhost:27017/test",
	collection : "syslog",
	interval : 1000,
	batch : 100
}

class MongoTransporter extends Transporter {
	constructor(id) {
		super(id);
	}

	async configure(config, callback) {
		this.config = extend({},DEF_CONF,config);
		this.msg = config.format? expression.expr(JSON.stringify(config.format)) : nofn;
		this.cn = this.config.collection;
		this.buffer = [];
		callback();
	}

	async start(callback) {
		var cfg = this.config, buffer = this.buffer;

		try {
			this.db = await MongoClient.connect(this.config.url);
			this.resume(callback);
		}catch(err) {
			logger.error(`Cannot stablish connection to mongo (${cfg.url})`);
			callback(err);
		}
	}

	resume(callback) {
		var cfg = this.config, buffer = this.buffer;

		if(this.ival==null) {
			this.ival = setInterval(()=>{
				while(buffer.length) {
					var arr = buffer.splice(0,cfg.batch);
					this.db.collection(this.cn).insert(arr,(err,res)=>{
						if(err) logger.error(err);
					});
				}
			},cfg.interval);
		}
	}

	pause(callback) {
		clearInterval(this.ival);
		this.ival = null;
		callback();
	}

	close(callback) {
		clearInterval(this.ival);
		this.ival = null;
		this.buffer = [];
		callback();
	}

	transport(entry,callback) {
		this.buffer.unshift(entry);
		callback(null,entry);
	}
}

module.exports = MongoTransporter;
