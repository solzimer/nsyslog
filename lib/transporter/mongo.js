const
	expression = require("../expression.js"),
	extend = require("extend"),
	MongoClient = require("mongodb").MongoClient;

const nofn = entry=>entry;
const DEF_CONF = {
	url : "mongodb://localhost:27017/test",
	collection : "syslog",
	interval : 1000,
	batch : 100
}

class MongoTransport {
	constructor(config) {
		this.config = extend({},DEF_CONF,config);
		this.msg = config.format? expression.expr(JSON.stringify(config.format)) : nofn;
		this.mongo = MongoClient.connect(this.config.url);
		this.cn = this.config.collection;
		this.buffer = [];

		this.mongo.then(
			db=>this.init(db),
			err=>{
				console.error("Cannot stablish connection to mongo");
			}
		)
	}

	init(db) {
		var cfg = this.config, buffer = this.buffer;

		this.ival = setInterval(()=>{
			while(buffer.length) {
				var arr = buffer.splice(0,cfg.batch);
				db.collection(this.cn).insert(arr,(err,res)=>{
					if(err) console.error(err);
				});
			}
		},cfg.interval);
	}

	transport(entry,callback) {
		this.mongo.then(db=>{
			buffer.unshift(entry);
			callback(null,entry);
		},err=>{
			callback(err,entry);
		});
	}
}

module.exports = MongoTransport;
