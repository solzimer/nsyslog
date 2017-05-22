const
	expression = require("../expression.js"),
	extend = require("extend"),
	MongoClient = require("mongodb").MongoClient;

const nofn = entry=>entry;
const DEF_CONF = {
	url : "mongodb://localhost:27017/test",
	collection : "syslog"
}

class MongoTransport {
	constructor(config) {
		this.config = extend({},DEF_CONF,config);
		this.msg = config.format? expression.expr(JSON.stringify(config.format)) : nofn;
		this.mongo = MongoClient.connect(this.config.url);
		this.cn = this.config.collection;
	}
	send(entry,callback) {
		this.mongo.then(db=>{
			db.collection(this.cn).insert(entry,(err,res)=>{
				callback(err,entry);
			});
		});
	}
}

module.exports = MongoTransport;