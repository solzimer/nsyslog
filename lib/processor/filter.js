const
	Processor = require("./"),
	Semaphore = require('../semaphore'),
	logger = require('../logger'),
	Path = require('path'),
	extend = require("extend"),
	Watermark = require("../watermark").Master,
	jsexpr = require("jsexpr");

const TTL_IVAL = 1000;
const vfn = ()=>{};
const MODE = {
	accept : "accept",
	reject : "reject",
	every : "every"
};

const DEF_CONF = {
	buffer : 1000,
	mode : MODE.accept,
	filter : "true",
	key : "'all'",
	every : 1,
	first : true,
	ttl : 0,
	output : "aggregate",
	aggregate : {
		"count" : 1
	}
};

/**
 * FilterProcessor class for filtering, aggregating, and managing log entries.
 * 
 * This processor can:
 * - Accept or reject entries based on a filter expression.
 * - Aggregate multiple entries based on a key, outputting only the aggregated result.
 * 
 * @extends Processor
 */
class FilterProcessor extends Processor {
	/**
	 * Creates an instance of FilterProcessor.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
		this.buffer = {};
		this.blen = 0;
		this.ttls = {};
		this.sem = new Semaphore(1);
		this.evsem = new Semaphore(1);
		this.ttlival = null;
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {number} [config.buffer=1000] - Maximum buffer size for in-memory storage.
	 * @param {string} [config.mode='accept'] - Processing mode:
	 *   - **accept**: Accept entries that match the filter.
	 *   - **reject**: Reject entries that match the filter.
	 *   - **every**: Aggregate entries that match the filter.
	 * @param {string} [config.filter='true'] - JavaScript expression to evaluate whether an entry matches the filter.
	 * @param {string} [config.key="'all'"] - Expression to determine the aggregation key for grouping entries.
	 * @param {number} [config.every=1] - Number of entries to aggregate before outputting the next entry.
	 * @param {boolean} [config.first=true] - Determines if the first entry generates an output immediately:
	 *   - **true**: The first entry in a group is output immediately.
	 *   - **false**: Wait until the `every` condition is met before outputting.
	 * @param {number} [config.ttl=0] - Time-to-live for entries in milliseconds. When the timeout is reached, the aggregated results are output even if the `every` condition has not been met.
	 * @param {string} [config.output='aggregate'] - Output field to store the aggregated results.
	 * @param {Object} [config.aggregate={count: 1}] - Object describing the aggregations to be performed. Each key represents a field in the output, and its value is an expression to calculate the aggregated value.
	 * @param {Function} callback - The callback function.
	 */
	async configure(config, callback) {
		let spath = Path.resolve(config.$datadir,"filter",`${process.pid}/${this.id}_store`);
		let tpath = Path.resolve(config.$datadir,"filter",`${process.pid}/${this.id}_ttl`);

		this.config = extend({},DEF_CONF,config);
		this.mode = MODE[this.config.mode] || MODE.accept;
		this.filter = jsexpr.eval(this.config.filter);
		this.key = jsexpr.expr(this.config.key);
		this.ttl = Math.abs(parseInt(this.config.ttl)) || DEF_CONF.ttl;
		this.every = parseInt(this.config.every) || DEF_CONF.every;
		this.output = jsexpr.assign(this.config.output);
		this.aggregate = jsexpr.expr(this.config.aggregate);
		this.first = this.config.first;
		this.maxbuff = this.config.buffer;
		this.store = new Watermark(spath);
		this.ttlstore = new Watermark(tpath);

		await this.store.start();
		await this.ttlstore.start();

		callback();
	}

	/**
	 * Purges the in-memory buffer to the persistent store if it exceeds the maximum size.
	 */
	async purgeMemory() {
		if(this.blen>this.maxbuff) {
			await this.store.saveall(this.buffer);
			this.buffer = {};
			this.blen = 0;
		}
	}

	/**
	 * Retrieves or initializes an item in the buffer.
	 * @param {string} key - The key for the buffer item.
	 * @param {Object} entry - The log entry associated with the buffer item.
	 * @returns {Promise<Object>} - The buffer item containing aggregated data.
	 */
	async getItem(key, entry) {
		if(!this.buffer[key]) {
			let item = await this.store.get(key);
			item = extend({first:this.first,data:{},size:0,ts:Date.now()},item);
			item.entry = item.entry || entry;
			this.buffer[key] = item;
			this.blen++;
		}
		return this.buffer[key];
	}

	/**
	 * Updates the TTL (time-to-live) for a buffer item.
	 * @param {Object} buff - The buffer item to update.
	 */
	async updateTTL(buff) {
		var ttl = null;
		var key = buff.ttl;
		var isnew = false;

		await this.sem.take();

		// Round to 1 second
		if(!key) {
			key = buff.ttl = `${Math.floor(Date.now() / 1000.0) * 1000}`;

			if(!this.ttls[key]) {
				ttl = await this.ttlstore.get(key);
				this.ttls[key] = ttl;
			}
			else {
				ttl = this.ttls[key];
			}

			if(!ttl.items) ttl.items = {};
			ttl.items[buff._id] = true;
		}

		this.sem.leave();
	}

	/**
	 * Periodically processes expired TTL entries and outputs their aggregated results.
	 */
	async loopTTL() {
		let ttls = [];
		let ids = {};
		let since = Date.now()-this.ttl;

		await this.sem.take();

		try {
			await this.ttlstore.saveall(this.ttls);
			await this.ttlstore.readStream({lt:`${since}`},(key,value)=>{
				ttls.push(key);
				Object.keys(value.items).forEach(id=>ids[id]=true);
			});
			ids = Object.keys(ids);
			let buffs = await Promise.all(
				ids.map(id=>this.buffer[id] || this.store.get(id))
			);
			await this.ttlstore.removeall(ttls);
			await this.store.removeall(ids);
			ids.forEach(id=>delete this.buffer[id]);
			buffs.forEach(buff=>{
				let entry = buff.entry;
				let dts = Math.floor((Date.now() - buff.timestamp) / 1000) * 1000;
				extend(buff.data,{_dts:dts});
				this.output(entry,buff.data);
				this.push(entry,vfn);
			});
		}catch(err) {
			logger.error(err);
		}

		this.ttls = {};
		this.sem.leave();
		this.ttlival = setTimeout(()=>this.loopTTL(),TTL_IVAL);
	}

	/**
	 * Starts the processor and initializes TTL handling if configured.
	 * @param {Function} callback - The callback function.
	 */
	async start(callback) {
		if(this.ttl) {
			this.ttlival = setTimeout(()=>this.loopTTL(),TTL_IVAL);
		}
		callback();
	}

	/**
	 * Stops the processor and clears TTL intervals.
	 * @param {Function} callback - The callback function.
	 */
	async stop(callback) {
		if(this.ttlival)
			clearInterval(this.ttlival);
		callback();
	}

	/**
	 * Processes a log entry based on the configured mode and filter.
	 * 
	 * - In **accept** mode, entries that match the filter are output.
	 * - In **reject** mode, entries that do not match the filter are output.
	 * - In **every** mode, entries are aggregated based on the key and output when the `every` condition or `ttl` is met.
	 * 
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function.
	 */
	async process(entry, callback) {
		let test = this.filter(entry);
		let key = this.key(entry);

		await this.sem.take();
		await this.purgeMemory();
		this.sem.leave();

		switch(this.mode) {
			case MODE.reject :
				return callback(null, test? null : entry);
			case 'every' :
				if(!test) return callback(null);
				await this.evsem.take();
				let aggr = this.aggregate(entry);
				let buff = await this.getItem(key,entry);

				buff.size++;
				Object.keys(aggr).forEach(k=>{
					buff.data[k] = buff.data[k]!==undefined? (buff.data[k]+aggr[k]) : aggr[k];
				});

				if(buff.first || buff.size>=this.every) {
					let dts = Math.floor((Date.now() - buff.timestamp) / 1000) * 1000;
					buff.first = false;
					extend(buff.data,{_dts:dts});
					this.output(entry,buff.data);
					buff.data = {};
					buff.size = 0;
					this.evsem.leave();
					return callback(null,entry);
				}
				else {
					if(this.ttl)
						await this.updateTTL(buff);
					this.evsem.leave();
					return callback(null);
				}
				break;
			case 'accept' :
			default :
				return callback(null, test? entry : null);
		}
	}
}

module.exports = FilterProcessor;
