const
	logger = require('../logger'),
	Input = require('./'),
	extend = require('extend'),
	jsexpr = require('jsexpr'),
	Watermark = require("../watermark"),
	MongoClient = require("mongodb").MongoClient;

const DEFAULTS = {
	url : "mongodb://localhost:27017/test",
	collection : "test",
	query : {},
	watermark :  {},
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
		this.owm = config.watermark || DEFAULTS.watermark;
		this.query = jsexpr.expr(config.query || DEFAULTS.query);
		this.cursors = {};

		this.watermark = new Watermark(config.$datadir);
		await this.watermark.start();
		this.wm = await this.watermark.get(this.id);
		this.wm.cols = this.wm.cols || {};

		let cols = config.collection || DEFAULTS.collection;
		if(!Array.isArray(cols)) cols = [cols];
		this.collection = cols.map(c=>{
			if(c.startsWith('/')) return new RegExp(c.replace(/^\/|\/$/g,''));
			else return c;
		});

		callback();
	}

	get mode() {
		return Input.MODE.pull;
	}

	/**
	 * Get collections from mongo that matches the config patterns, and initializes
	 * its watermarks
	 * @return {Promise} Collections
	 */
	async fetchCollections() {
		let cols = await this.db.listCollections().toArray();
		cols = cols.filter(col=>{
			let name = col.name;
			return this.collection.reduce((res,pattern)=>{
				return res || (typeof(pattern)=='string'? name==pattern : pattern.test(name));
			},false);
		});

		let colmap = cols.reduce((map,c)=>{map[c.name] = c; return map;},cols);

		// Remove obsolete watermarks
		Object.keys(this.wm).forEach(cname=>{
			if(!colmap[cname])
				delete this.wm.cols[cname];
		});

		// Add new watermarks
		cols.forEach(c=>{
			if(!this.wm.cols[c.name])
				this.wm.cols[c.name] = this.owm;
		});

		// Save watermarks
		await this.watermark.save(this.wm);

		console.log(this.wm);
		this.cols = cols;

		return this.cols;
	}

	async fetchData(colname) {
		let owm = this.wm.cols[colname] || this.owm;
		let query = this.query(owm);

		logger.debug(`${this.id}: Query:`);
		logger.debug(query);
		
		let pcursor = this.db.collection(colname).find(query);
		this.cursors[colname] = pcursor;

		let cursor = await pcursor;
		this.cursors[colname] = cursor;
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

		let cols = await this.fetchCollections();
		logger.debug(`${this.id} Matched collections: `,cols.map(c=>c.name));

		callback();
	}

	async next(callback) {
		let data = false;
		let len = this.cols.length;
		let counter = 0;

		while(!data) {
			let col = this.cols.shift(), cname = col.name;

			this.cols.push(col);
			counter++;

			let cursor = this.cursors[cname];
			// No cursor, fetch data
			if(!cursor) {
				this.fetchData(cname);
				logger.debug(`${this.id}: Query for collection ${cname} started`);
			}
			// Doing query, is a promise
			else if(cursor.then) {
				logger.debug(`${this.id}: Query for collection ${cname} already running`);
			}
			// Is an actual cursor
			else if(cursor.hasNext) {
				let hasNext = await cursor.hasNext();
				if(!hasNext) {
					await cursor.close();
					delete this.cursors[cname];
				}
				else {
					data = await cursor.next();
					this.wm.cols[cname] = data;
				}
			}

			// If no data read in any collection, wait
			if(!data && (counter%len)==0) {
				logger.debug(`${this.id}: No data read in any collection. Waiting...`);
				await new Promise(ok=>setTimeout(ok,1000));
			}
		}

		callback(null,{
			id : this.id,
			type : this.type,
			originalMessage: data
		});
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

	function next() {
		input.next((err,item)=>{
			if(err) {
				logger.error(err);
				process.exit(1);
			}
			else {
				console.log(item);
				setImmediate(next,1000);
			}
		});
	}

	input.configure({
		$datadir:'/tmp/nsyslog',
		url : 'mongodb://localhost/logicalog',
		collection : ["/loghost.logline.*/"],
		query : {line:{$gt:'${line}'}},
		watermark : {line:0},
	},()=>{
		input.start(next);
	});
}
