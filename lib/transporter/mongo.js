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

/**
 * MongoSimpleTransporter is a transporter for sending log messages to a MongoDB collection.
 * 
 * @extends Transporter
 */
class MongoSimpleTransporter extends Transporter {
	/**
	 * Creates an instance of MongoSimpleTransporter.
	 * 
	 * @param {string} id - The unique identifier for the transporter.
	 * @param {string} type - The type of the transporter.
	 */
	constructor(id,type) {
		super(id,type);
		this.connected = null;
	}

	/**
	 * Configures the transporter with the provided settings.
	 * 
	 * @param {Object} config - Configuration object for the transporter.
	 * @param {string} [config.url="mongodb://localhost:27017/test"] - The MongoDB connection URL.
	 * @param {string} [config.collection="nsyslog"] - The MongoDB collection to store log messages.
	 * @param {number} [config.interval=100] - Interval for batch insertion in milliseconds.
	 * @param {number} [config.batch=1000] - Maximum number of messages per batch.
	 * @param {boolean} [config.retry=true] - Whether to retry inserting messages on failure.
	 * @param {number} [config.maxRetry=Number.MAX_VALUE] - Maximum number of retries for insertion.
	 * @param {number} [config.maxPool=5] - Maximum number of concurrent insertions.
	 * @param {Object} [config.options] - Additional options for the MongoDB client.
	 * @param {Function} callback - Callback function to signal completion.
	 */
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

	/**
	 * Connects to the MongoDB server.
	 */
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

	/**
	 * Creates indexes on the specified MongoDB collection.
	 * 
	 * @param {string} col - The MongoDB collection name.
	 */
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

	/**
	 * Inserts a batch of log messages into the MongoDB collection.
	 * 
	 * @param {string} col - The MongoDB collection name.
	 * @param {Array} arr - Array of log messages to insert.
	 */
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

	/**
	 * Handles the insertion loop for batch processing.
	 * 
	 * @param {boolean} start - Whether to start or stop the loop.
	 */
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

	/**
	 * Starts the transporter and initializes the MongoDB connection.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	start(callback) {
		this.connected = this.connect();
		if(callback) callback();
	}

	/**
	 * Resumes the insertion loop.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		this.insertLoop(true);
		if(callback) callback();
	}

	/**
	 * Pauses the insertion loop.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		this.insertLoop(false);
		if(callback) callback();
	}

	/**
	 * Stops the transporter and closes the MongoDB connection.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		this.insertLoop(false);
		if(this.server && this.server.close)
			this.server.close();
		this.connected = null;
		this.buffer = [];
		if(callback) callback();
	}

	/**
	 * Transports a log entry by adding it to the buffer for batch insertion.
	 * 
	 * @param {Object} entry - The log entry to be transported.
	 * @param {Function} callback - Callback function to signal completion.
	 */
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

/**
 * MongoTransporter is a transporter for managing multiple MongoDB connections.
 * 
 * @extends Transporter
 */
class MongoTransporter extends Transporter {
	/**
	 * Creates an instance of MongoTransporter.
	 * 
	 * @param {string} id - The unique identifier for the transporter.
	 * @param {string} type - The type of the transporter.
	 */
	constructor(id,type) {
		super(id,type);
		this.connected = null;
		this.transporters = {}
	}

	/**
	 * Configures the transporter with the provided settings.
	 * 
	 * @param {Object} config - Configuration object for the transporter.
	 * @param {string} [config.url] - The MongoDB connection URL.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config, callback) {
		this.config = config;
		this.url = jsexpr.expr(config.url);
		callback();
	}

	/**
	 * Sends a command to all managed MongoDB connections.
	 * 
	 * @param {string} cmd - The command to send (e.g., "resume", "pause", "stop").
	 * @param {Function} callback - Callback function to signal completion.
	 */
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

	/**
	 * Starts the transporter.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	start(callback) {
		if(callback) callback();
	}

	/**
	 * Resumes all managed MongoDB connections.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		return this.sendCommand('resume',callback);
	}

	/**
	 * Pauses all managed MongoDB connections.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		return this.sendCommand('pause',callback);
	}

	/**
	 * Stops all managed MongoDB connections.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		return this.sendCommand('stop',callback);
	}

	/**
	 * Transports a log entry by delegating it to the appropriate MongoDB connection.
	 * 
	 * @param {Object} entry - The log entry to be transported.
	 * @param {Function} callback - Callback function to signal completion.
	 */
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
