const
	logger = require('../logger'),
	Input = require('./'),
	extend = require('extend'),
	Watermark = require("../watermark"),
	MongoClient = require("mongodb").MongoClient;

const DEFAULTS = {
	url : "mongodb://localhost:27017/test",
	options : {}
}

class MongoInput extends Input {
	constructor(id,type) {
		super(id,type);
	}

	async configure(config,callback) {
		config = config || {};
		this.url = config.url || DEFAULTS.url;
		this.options = config.options || DEFAULTS.options;
		this.watermark = new Watermark(config.$datadir);
		await this.watermark.start();
		this.wm = await this.watermark.get(this.id);

		callback();
	}

	get mode() {
		return Input.MODE.pull;
	}

	async start(callback) {
		let connected = false;

		while(!connected) {
			try {
				this.db = await MongoClient.connect(this.url,this.options);
				connected = true;
			}catch(err) {
				logger.error(`Cannot stablish connection to mongo (${this.url})`);
				logger.error(err);
				await new Promise(ok=>setTimeout(ok,2000));
			}
		}

		let cols = await this.db.listCollections().toArray();
		console.log(cols);
		callback();
	}

	next(callback) {
	}

	stop(callback) {
	}

	pause(callback) {
		callback();
	}

	resume(callback) {
		callback();
	}

	key(entry) {
		return `${entry.input}:${entry.type}@${entry.database}:${entry.collection}`;
	}
}

if(module.parent) {
	module.exports = MongoInput;
}
else {
	let input = new MongoInput("mongo","mongo");
	input.configure({$datadir:'/tmp/nsyslog'},()=>{
		input.start(()=>{
			process.exit(0);
		});
	});
}
