const
	EventParser = require('./parser'),
	WinWatermark = require('./watermark'),
	logger = require('../../logger'),
	Input = require('..'),
	{spawn} = require("child_process"),
	Queue = require('../../queue'),
	Semaphore = require('../../semaphore'),
	path = require('path'),
	fs = require('fs-extra'),
	{MODE, FORMAT} = require('./constants');

const SEM = new Semaphore(1);

/**
 * WindowsReader class for reading Windows Event Logs.
 * Extends the base Input class.
 */
class WindowsReader extends Input {
	/**
	 * Constructor for WindowsReader.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);
		this.iread = true; // Indicates if the input is ready to read
	}

	/**
	 * Configures the WindowsReader with the provided settings.
	 * 
	 * @param {Object} config - Configuration object containing:
	 * @param {string} [config.channel="Application"] - Event log channel to read from.
	 * @param {string} [config.readmode="offset"] - Read mode (offset or watermark).
	 * @param {string|number} [config.offset] - Offset for reading events.
	 * @param {number} [config.batchsize=1000] - Number of events to fetch in each batch.
	 * @param {boolean} [config.remote=false] - Whether to read from a remote machine.
	 * @param {string} [config.username] - Username for remote access.
	 * @param {string} [config.password] - Password for remote access.
	 * @param {string} [config.query] - Query to filter events.
	 * @param {boolean} [config.extended=false] - Whether to fetch extended event data.
	 * @param {string} [config.format="json"] - Format of the output (json or xml).
	 * @param {number} [config.interval=500] - Interval in milliseconds between fetches.
	 * @param {Array<number>} [config.idfilter] - Array of event IDs to filter.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config, callback) {
		config = config || {};
		this.channel = config.channel || "Application";
		this.readmode = MODE[config.readmode] || MODE.offset;
		this.offset = config.offset;
		this.batchsize = parseInt(config.batchsize) || 1000;
		this.queue = new Queue();
		this.remote = config.remote || false;
		this.username = config.username || null;
		this.password = config.password || null;
		this.query = config.query || null;		
		this.extended = config.extended || false;
		this.path = config.$datadir;
		this.format = config.format || FORMAT.json;
		this.interval = config.interval || 500;
		this.idfilter = config.idfilter || null;
		this.child = null;
		this.disabled = false;
		this.watermark = new WinWatermark({
			path: this.path,
			id: this.id,
			channel: this.channel,
			readmode: this.readmode,
			offset: this.offset
		});
		await this.watermark.start();

		 // Create persistent filter file if idfilter is provided
		if (this.idfilter) {
			const idpath = this.idfilter.map(id => `(EventID=${id})`).join(' or ');
			this.xpath = `*[System[${idpath}]]`;
		}

		this.reading = null;
		callback();
	}

	/**
	 * Returns the mode of the input.
	 * @returns {string} The mode of the input (pull).
	 */
	get mode() {
		return Input.MODE.pull;
	}

	endFetch() {
		this.reading = false;
		if(this.child)
			this.child.kill(9);
		return this.watermark.save();
	}

	/**
	 * Fetches events from the Windows Event Log.
	 * @returns {Promise<void>}
	 */
	fetch() {
		if(this.reading) return this.reading;

		const wm = this.watermark.wm;
		const args = [
			"qe", wm.channel,
			`/f:${this.extended? 'RenderedXml':'XML'}`,
			`/c:${this.batchsize}`,
			`/BM:${wm.bm}`,
			`/SBM:${wm.bm}`
		];

		if(this.idfilter) args.push(`/q:${this.xpath}`);
		if(this.remote) args.push(`/r:${this.remote}`);
		if(this.username) args.push(`/u:${this.username}`);
		if(this.password) args.push(`/p:${this.password}`);

		this.reading = new Promise((ok,rej)=>{
			logger.debug(`Launch 'wevtutil ${args.join(" ")}'`);
			let child = this.child = spawn('wevtutil',args);
			let parser = new EventParser(this.format);

			child.stderr.on('data', data => {
				logger.warn(`[${this.id}] : ${data}`);
			});

			child.stdout.on('data', async (data) => {
				parser.feed(data, (item) => {
					this.queue.push(item);
				});
			});

			child.on('error', rej);
			child.on('close', async(code) => {
				logger.debug(`[${this.id}] : Exit Code ${code}`);
				// Success code
				if(code==0 || code==15008) {
					ok();
				}
				// Invalid watermark code
				else if(code==87 || code==2) {
					logger.warn(`[${this.id}] : Watermark is corrupted. Restarting`);
					await this.watermark.setup(true);
					ok();
				}
				// Channel not found or inaccessible code
				else if(code==15007) {
					logger.warn(`[${this.id}] : Channel ${this.channel} not found or not accessible. Disabling`);
					this.disabled = true;
					ok();
				}
				else if(code==5) {
					logger.warn(`[${this.id}] : Access to channel ${this.channel} denied. Disabling`);
					this.disabled = true;
					ok();
				}
				else {
					logger.error(`[${this.id}] : child process exited with code ${code}`);
					await this.watermark.setup(true);
					rej(code);
				}
			});
		}).then(()=>{
			logger.silly(`[${this.id}] : Save watermark (then)`);
			return this.endFetch();
		}).catch(err=>{
			logger.error(`[${this.id}] : Error on channel ${this.channel}`,err);
			logger.silly(`[${this.id}] : Save watermark (catch)`);
			return this.endFetch();
		});

		return this.reading;
	}

	/**
	 * Retrieves the next event from the queue.
	 * 
	 * @param {Function} callback - Callback function to process the next event.
	 */
	async next(callback) {
		if(this.disabled) {
			return callback();
		}
		
		if(!this.queue.size()) {

			// Read events
			try {
				await SEM.take();
				await this.fetch();
			}catch(err) {
				logger.error(`[${this.id}] : Error fetching events`, err);
			}finally {
				SEM.leave();
			}

			if(!this.queue.size()) {
				let timer = this.iread? 0 : this.interval;
				this.iread = false;
				callback(null,{$$timer:timer});
				//setTimeout(()=>this.next(callback),timer);
			}
			else {
				setImmediate(()=>this.next(callback));
			}
			return;
		}

		try {
			let item = await this.queue.pop(1000);
			this.iread = true;

			if(item.err)
				callback(item.err);
			else
				callback(null,{channel: this.channel, originalMessage: item.Event});
		}catch(err) {
				callback(err);
		}
	}

	/**
	 * Starts the WindowsReader and begins reading events.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async start(callback) {
		try {
			if(this.child)
				this.child.kill(9);
			await this.watermark.setup(false);
			await this.fetch();
			if(callback) callback();
		}catch(err) {
			if(callback) callback(err);
		}
	}

	/**
	 * Stops the WindowsReader and performs cleanup.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async stop(callback) {
		logger.info(`[${this.id}] : Save watermark (stop)`);
		await this.watermark.save();
		if(this.child)
			this.child.kill(9);
		if(callback) callback();
	}

	/**
	 * Pauses the WindowsReader, saving the current watermark state.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async pause(callback) {
		logger.info(`[${this.id}] : Save watermark (pause)`);
		await this.watermark.save();
		if(this.child)
			this.child.kill(9);
		if(callback) callback();
	}

	/**
	 * Resumes the WindowsReader.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		if(callback) callback();
	}
}

module.exports = WindowsReader;
