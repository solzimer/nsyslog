const
	logger = require('../logger'),
	Input = require('./'),
	extend = require('extend'),
	jsexpr = require('jsexpr'),
	Semaphore = require('../semaphore'),
	Watermark = require("../watermark"),
	{timer} = require('../util'),
	MongoClient = require("mongodb").MongoClient;

const IVAL_WM = 2000; // Interval for watermark updates in milliseconds
const DEFAULTS = {
	url: "mongodb://localhost:27017/test", // Default MongoDB connection URL
	collection: "test", // Default collection name
	maxCursors: 5, // Maximum number of concurrent cursors
	query: {}, // Default query
	sort: {}, // Default sort order
	watermark: {}, // Default watermark configuration
	options: {
		useUnifiedTopology: true,
		autoReconnect: true,
		reconnectTries: Number.MAX_VALUE
	}
};

/**
 * MongoInput class for handling MongoDB-based input.
 * Extends the base Input class.
 */
class MongoInput extends Input {
	/**
	 * Constructor for MongoInput.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);

		this.wmival = null; // Watermark interval timer
		this.connected = null; // Connection status
	}

	/**
	 * Configures the MongoInput with the provided settings.
	 * 
	 * @param {Object} config - Configuration object containing:
	 * @param {string} [config.url="mongodb://localhost:27017/test"] - MongoDB connection URL.
	 * @param {string|Array<string>} [config.collection="test"] - Collection(s) to monitor.
	 * @param {Object} [config.query={}] - Query to filter documents.
	 * @param {Object} [config.sort={}] - Sort order for documents.
	 * @param {Object} [config.watermark={}] - Initial watermark configuration.
	 * @param {number} [config.maxCursors=5] - Maximum number of concurrent cursors.
	 * @param {Object} [config.options] - MongoDB connection options.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config, callback) {
		this.config = config = extend(true, {}, DEFAULTS, config || {});
		this.url = config.url || DEFAULTS.url;
		this.options = config.options || DEFAULTS.options;
		this.owm = config.watermark || DEFAULTS.watermark;
		this.query = jsexpr.expr(config.query || DEFAULTS.query);
		this.sem = new Semaphore(config.maxCursors || DEFAULTS.maxCursors);
		this.sort = jsexpr.expr(config.sort || DEFAULTS.sort);
		this.cursors = {};

		this.watermark = new Watermark(config.$datadir);
		await this.watermark.start();
		this.wm = await this.watermark.get(this.id);
		this.wm.cols = this.wm.cols || {};

		let cols = config.collection || DEFAULTS.collection;
		if (!Array.isArray(cols)) cols = [cols];
		this.collection = cols.map(c => {
			if (c.startsWith('/')) return new RegExp(c.replace(/^\/|\/$/g, ''));
			else return c;
		});

		callback();
	}

	/**
	 * Returns the mode of the input.
	 * @returns {string} The mode of the input (pull).
	 */
	get mode() {
		return Input.MODE.pull;
	}

	/**
	 * Fetches collections from MongoDB that match the configured patterns
	 * and initializes their watermarks.
	 * 
	 * @param {number} [next] - Interval for fetching collections in milliseconds.
	 * @returns {Promise<Array>} Matched collections.
	 */
	async fetchCollections(next) {
		let cols = await this.db.listCollections().toArray();
		cols = cols.filter(col => {
			let name = col.name;
			return this.collection.reduce((res, pattern) => {
				return res || (typeof (pattern) == 'string' ? name == pattern : pattern.test(name));
			}, false);
		});

		let colmap = cols.reduce((map, c) => { map[c.name] = c; return map; }, cols);

		// Remove obsolete watermarks
		Object.keys(this.wm).forEach(cname => {
			if (!colmap[cname])
				delete this.wm.cols[cname];
		});

		// Add new watermarks
		cols.forEach(c => {
			if (!this.wm.cols[c.name])
				this.wm.cols[c.name] = this.owm;
		});

		// Save watermarks
		await this.saveWatermark(next);
		if (next) {
			this.wmival = setTimeout(() => this.fetchCollections(next), next);
		}

		logger.debug(`${this.id} Matched collections: `, cols.map(c => c.name));
		this.cols = cols;
		return this.cols;
	}

	/**
	 * Fetches data from a specific collection.
	 * 
	 * @param {string} colname - Name of the collection to fetch data from.
	 * @returns {Promise<Object|null>} Cursor for the fetched data.
	 */
	async fetchData(colname) {
		let cursor = null;
		await this.sem.take();

		try {
			let owm = this.wm.cols[colname] || this.owm;
			let query = this.query(owm);
			let sort = this.sort(owm);

			logger.silly(`${this.id}: Query: ${JSON.stringify(query)}`);
			cursor = await this.db.collection(colname).find(query).sort(sort);
			this.cursors[colname] = cursor;
		} catch (err) {
			this.sem.leave();
			delete this.cursors[colname];
			logger.error(err);
		}

		this.sem.leave();
		return cursor;
	}

	/**
	 * Saves the current watermark state to persistent storage.
	 * @returns {Promise<void>}
	 */
	async saveWatermark() {
		try {
			await this.watermark.save(this.wm);
			logger.debug(`${this.id}: Watermark saved`);
		} catch (err) {
			logger.error(err);
		}
	}

	/**
	 * Establishes a connection to the MongoDB server and initializes collections.
	 * Reconnects automatically if the connection is lost.
	 * @returns {Promise<void>}
	 */
	async connect() {
		let connected = false;

		while (!connected) {
			try {
				this.server = await MongoClient.connect(this.url, this.options);
				this.server.on('close', () => logger.warn(`${this.id}: MongoDB -> lost connection`, this.url));
				this.server.on('reconnect', () => logger.warn(`${this.id}: MongoDB -> reconnect`, this.url));
				this.db = this.server.db();
				await this.fetchCollections(IVAL_WM);
				connected = true;
			} catch (err) {
				logger.error(`${this.id}: Cannot stablish connection to mongo (${this.url})`);
				logger.error(err);
				await timer(2000);
			}
		}
	}

	/**
	 * Starts the MongoInput and establishes a connection to MongoDB.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async start(callback) {
		this.connected = this.connect();
		if (callback) callback();
	}

	/**
	 * Retrieves the next item from the MongoDB collections.
	 * 
	 * @param {Function} callback - Callback function to process the next item.
	 */
	async next(callback) {
		await this.connected;

		let data = false;
		let len = this.cols.length;
		let counter = 0, ccol = null;

		while (!data) {
			let col = this.cols.shift(),
				cname = col ? col.name : null,
				cursor = cname ? this.cursors[cname] : null;

			if (col) this.cols.push(col);
			ccol = col;
			counter++;

			// No matching cols
			if (!col) {
				logger.warn(`${this.id}: No matching collections...`);
				await timer(1000);
			}
			// No cursor, fetch data
			else if (!cursor) {
				this.cursors[cname] = this.fetchData(cname);
				logger.debug(`${this.id}: Query for collection ${cname} started`);
			}
			// Doing query, is a promise
			else if (cursor.then) {
				logger.debug(`${this.id}: Query for collection ${cname} already running`);
			}
			// Is an actual cursor
			else if (cursor.hasNext) {
				logger.silly(`${this.id}: Cursor for ${cname} is opened`);
				try {
					let hasNext = await cursor.hasNext();
					if (!hasNext) {
						await cursor.close();
						delete this.cursors[cname];
					}
					else {
						data = await cursor.next();
						this.wm.cols[cname] = data;
					}
				} catch (err) {
					logger.error(err);
				}
			}

			// If no data read in any collection, wait
			if (!data && (counter % len) == 0) {
				logger.debug(`${this.id}: No data read in any collection. Waiting...`);
				await timer(1000);
			}
		}

		if (callback) {
			callback(null, {
				id: this.id,
				type: this.type,
				collection: ccol.name,
				database: this.db.name,
				originalMessage: data
			});
		}
	}

	/**
	 * Stops the MongoInput and performs cleanup.
	 * Closes all active cursors and the MongoDB connection.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async stop(callback) {
		await this.pause();

		let pall = Object.keys(this.cursors).map(cname => {
			let cursor = this.cursors[cname];
			if (!cursor) return Promise.resolve();
			else if (cursor.then) {
				return cursor.then(c => c.close());
			}
			else {
				return cursor.close();
			}
		});

		await Promise.all(pall);
		if (this.server && this.server.close)
			await this.server.close();
		this.connected = null;

		if (callback) callback();
	}

	/**
	 * Pauses the MongoInput by halting watermark updates and saving the current state.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async pause(callback) {
		clearTimeout(this.wmival);
		await this.saveWatermark();

		if (callback) callback();
	}

	/**
	 * Resumes the MongoInput by restarting watermark updates.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async resume(callback) {
		await this.fetchCollections(IVAL_WM);

		if (callback) callback();
	}

	/**
	 * Generates a unique key for the input entry.
	 * 
	 * @param {Object} entry - Input entry object.
	 * @returns {string} Unique key for the entry.
	 */
	key(entry) {
		return `${entry.input}:${entry.type}@${entry.database}:${entry.collection}`;
	}
}

if (module.parent) {
	module.exports = MongoInput;
} else {
	// Example usage of MongoInput
	let input = new MongoInput("mongo", "mongo");
	logger.setLevel('debug');
	input.configure({
		$datadir: '/tmp/nsyslog',
		url: 'mongodb://localhost/logicalog',
		collection: ["/loghost.logline.*/"],
		query: { line: { $gt: '${line}' } },
		watermark: { line: 0 },
		maxCursors: 10
	}, () => {
		input.start(() => {
			function next() {
				input.next((err, item) => {
					if (err) {
						logger.error(err);
						process.exit(1);
					} else {
						logger.debug(item);
						setImmediate(next, 1000);
					}
				});
			}
			next();
		});
	});
}
