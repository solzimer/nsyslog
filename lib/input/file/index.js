//TODO: Cerrar los monitores de archivos que ya no sean necesarios

/**
 * File Reader Input Module
 * Handles file reading, monitoring, and watermarking for input processing.
 * @module FileInput
 */

const Input = require('..'),
	Semaphore = require('../../semaphore'),
	jsexpr = require('jsexpr'),
	fs = require('fs-extra'),
	Path = require('path'),
	extend = require('extend'),
	minimatch = require('minimatch'),
	slash = require('slash'),
	logger = require("../../logger"),
	Watermark = require("../../watermark"),
	filesystem = require("./filesystem"),
	File = filesystem.File,
	Monitor = filesystem.Monitor,
	glob = filesystem.glob;

const BUFFER = 1024 * 10; // Default buffer size for file reading
const MAX_OPEN = 100; // Maximum number of open files
const MAX_MONITORS = 100; // Maximum number of file monitors

const MODE = {
	offset: "offset", // Read mode based on offset
	watermark: "watermark" // Read mode based on watermark
};

const OFFSET = {
	end: "end", // Start reading from the end of the file
	begin: "begin", // Start reading from the beginning of the file
	start: "start" // Alias for beginning of the file
};

/**
 * File Reader Input
 * @class
 * @extends Input
 */
class FileInput extends Input {
	/**
	 * Constructor for FileInput
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);
		/**
		 * File map
		 * @type {Object<string, filesystem.File>}
		 */
		this.files = {};
		this.list = { read: {}, avail: {} };
		this.sem = new Semaphore(1);

		/**
		 * Inner watermark instance
		 * @type {Watermark}
		 */
		this.watermark = null;

		/**
		 * File watermarks
		 * @type {Object}
		 */
		this.wm = null;

		/**
		 * File monitor
		 * @type {Map<string,filesystem.Monitor>}
		 */
		this.monitors = new Map();
	}

	/**
	 * Configures the FileInput instance.
	 * @param {Object} config - Configuration object.
	 * @param {Function} callback - Callback function.
	 */
	async configure(config, callback) {
		config = config || {};
		this.path = jsexpr.expr(config.path); // Parse the path expression
		if (config.exclude)
			this.exclude = slash(Path.resolve(config.$path, config.exclude)); // Resolve exclude path
		this.readmode = config.readmode || MODE.offset; // Set read mode
		this.offset = config.offset || MODE.end; // Set offset mode
		this.encoding = config.encoding || 'utf8'; // Set file encoding
		this.watch = config.watch || false; // Enable/disable file watching
		this.blocksize = config.blocksize || BUFFER; // Set block size for reading
		this.options = config.options || {}; // Additional options
		this.config = config; // Store configuration
		callback();
	}

	/**
	 * Retrieves the mode of the input.
	 * @returns {string} The mode of the input.
	 */
	get mode() {
		return Input.MODE.pull; // Always return pull mode
	}

	/**
	 * Retrieves the watermarks for the files.
	 * @returns {Promise<Array<Object>>} List of watermarks.
	 */
	async watermarks() {
		// Filter and map watermark data to a simplified structure
		return Object.keys(this.wm || {}).filter(k => k != "_id").map(k => {
			return {
				key: `${this.id}:${this.type}@${k}`, // Unique key for the file
				long: this.wm[k].stats.size, // File size
				current: this.wm[k].offset, // Current offset
			};
		});
	}

	/**
	 * Saves the current state of the files and watermarks.
	 * @returns {Promise<void>}
	 */
	async save() {
		await this.sem.take(); // Acquire semaphore to ensure thread safety

		try {
			// Update watermark data for all files
			Object.keys(this.files).map(k => this.files[k]).forEach(file => {
				this.wm[file.path] = file.toJSON();
			});
			// Persist watermark data if the watermark instance exists
			if (this.watermark)
				this.watermark.save(this.wm);
		} catch (err) {
			logger.error(err); // Log any errors
		}

		this.sem.leave(); // Release semaphore
	}

	/**
	 * Cleans up the file lists by removing unavailable files.
	 */
	sanityzeFiles() {
		// Remove unavailable files from the available list
		Object.keys(this.list.avail).filter(path => !this.files[path]).forEach(rp => delete this.list.avail[rp]);
		// Remove unavailable files from the read list
		Object.keys(this.list.read).filter(path => !this.files[path]).forEach(rp => {
			delete this.list.read[rp];
		});
	}

	/**
	 * Opens a file for reading and initializes its state.
	 * @param {string} path - Path to the file.
	 * @returns {Promise<filesystem.File>} The opened file instance.
	 */
	async openFile(path) {
		let files = this.files, sem = this.sem, wm = this.wm;

		// Excluded files
		if (this.exclude && minimatch(path, this.exclude)) {
			logger.info(`${path} is excluded`); // Log excluded file
			return;
		}

		await sem.take(); // Acquire semaphore

		if (!files[path] || !files[path].fd) {
			// Initialize file state
			let tail = "", offset = 0, line = 0, lines = [];
			let fd = await fs.open(path, 'r'); // Open file descriptor
			let stats = await fs.fstat(fd); // Get file stats
			let buffer = this.blocksize; // Set buffer size
			let idx = parseInt(this.offset); // Parse offset

			// Determine initial offset based on read mode
			if (this.readmode == MODE.watermark) {
				// Use watermark data if available
				if (wm[path]) {
					offset = wm[path].offset || 0;
					tail = wm[path].tail || "";
					line = wm[path].line || 0;
					lines = wm[path].lines || [];
					logger.silly(`Found ${path} in watermarks`);
				} else {
					// Default offset logic
					logger.silly(`Not found ${path} in watermarks`);
					if (idx >= 0) offset = idx;
					else if (this.offset == OFFSET.begin) offset = 0;
					else if (this.offset == OFFSET.start) offset = 0;
					else offset = stats.size;
				}
			} else if (this.readmode == MODE.offset) {
				// Offset-based reading
				if (idx >= 0) offset = idx;
				else if (this.offset == OFFSET.begin) offset = 0;
				else if (this.offset == OFFSET.start) offset = 0;
				else offset = stats.size;
			}

			// Create a new File instance and initialize its state
			files[path] = new File(path, fd, stats, offset, buffer, tail, line, lines);
			files[path].ready = true; // Mark file as ready
			this.list.read[path] = true; // Add to read list
			extend(true, wm, { [path]: files[path].toJSON() }); // Update watermark data
		}

		sem.leave(); // Release semaphore
		return files[path];
	}

	/**
	 * Reads lines from the monitored files.
	 * @returns {Promise<Array<filesystem.File>>} List of files with updated lines.
	 */
	readlines() {
		let files = this.watch?
			Object.keys(this.list.read).map(k=>this.files[k]) :
			Object.keys(this.files).map(k=>this.files[k]);

		let all = files.
			filter(Boolean).
			map(async(file)=>{
				try {
					await this.openFile(file.path);
					await file.sem.take();

					logger.silly(`Reading ${file.path} from ${file.offset}`);
					if(!file.fd) return file;

					let res = await fs.read(file.fd,file.buffer,0,file.buffer.length,file.offset);
					file.tail += res.buffer.toString('utf8',0,res.bytesRead);
					file.offset += res.bytesRead;

					// File trunctation
					logger.silly(`Read ${res.bytesRead} from ${file.path}`);
					if(res.bytesRead==0) {
						let fstat = await fs.stat(file.path);
						if((fstat.size < file.offset) || (fstat.ino != file.stats.ino)) {
							if(fstat.ino != file.stats.ino) {
								logger.warn(`File ${file.path} seems to be another file. Reseting reference.`);
							}
							else {
								logger.warn(`File ${file.path} has been truncated. Reseting watermark`);
							}

							file.offset = 0;
							if(file.fd) {
								await fs.close(file.fd);
								file.fd = null;
							}
						}
						else {
							logger.silly(`Nothing to read from ${file.path}. Closing file`);
							
							// Stop reading file until change
							delete this.list.read[file.path];
							file.ready = false;
							if(file.fd) {
								await fs.close(file.fd);
								file.fd = null;
							}
						}
					}

					let lines = file.tail.split("\n");
					while(lines.length) {
						let line = lines.shift();
						if(lines.length) {
							file.line++;
							file.lines.push({ln:file.line, line});
						}
						else file.tail = line;
					}
					this.wm[file.path] = file.toJSON();
					if(file.lines.length) this.list.avail[file.path] = true;
					file.sem.leave();
					return file;
				}catch(err) {
					logger.error(err);
					file.sem.leave();
					throw err;
				}
			});

		return Promise.all(all);
	}

	/**
	 * Fetches a single line from the available files.
	 * @returns {Object|boolean} The fetched line or false if no lines are available.
	 */
	fetchLine() {
		this.sanityzeFiles();

		let files = Object.keys(this.list.avail), len = files.length;

		if(!len) return false;

		let rnd = Math.floor(Math.random()*len);
		let file = this.files[files[rnd]];
		let entry = file.lines.shift();
		let data = {
			type : 'file',
			path : file.path,
			filename : file.filename,
			ln : entry.ln,
			originalMessage : entry.line
		};

		if(!file.lines.length)
			delete this.list.avail[file.path];

		return data;
	}

	async watchFiles() {
		let monitors = Array.from(this.monitors.values());
		if(monitors.length > MAX_MONITORS) {
			logger.warn(`Maximum number of file monitors (${MAX_MONITORS}) reached. Removing older monitors.`);
			// Remove the oldest monitor if the limit is reached
			monitors.sort((a, b) => a.timestamp - b.timestamp);
			while(monitors.length > MAX_MONITORS) {
				/**@type {Monitor} */
				let monitor = monitors.shift();
				monitor.stop();
				monitor.removeAllListeners();
				this.monitors.delete(monitor.path);
				logger.warn(`Removed monitor for ${monitor.path} due to limit reached.`);
			}
		}

		const config = this.config;
		const path = slash(Path.resolve(config.$path, this.path(""))); // Resolve and normalize the path
		if(!this.monitors.has(path)) {
			const monitor = new Monitor(this.files); // Create a new monitor instance
			this.monitors.set(path, monitor); // Create a new monitor instance
			monitor.start(path, this.options);
			monitor.on('new', path => this.openFile(path));
			monitor.on('ready', path => {
				this.list.read[path] = true;
			});
		}
	}

	/**
	 * Starts the FileInput instance.
	 * @param {Function} callback - Callback function.
	 */
	async start(callback) {
		try {
			this.watermark = new Watermark(this.config.$datadir);
			await this.watermark.start();
			this.wm = await this.watermark.get(this.id);
		}catch(err) {
			return callback(err);
		}

		try {
			if(this.watch) {
				await this.watchFiles(); // Start file monitoring
				this.ivalWatch = setInterval(async()=>{
					await this.watchFiles(); // Check for new files to monitor
				},5000);
			}
			else {
				let files = await glob(this.path,{nodir:true});
				await Promise.all(files.map(path=>this.openFile(path)));
			}

			callback();
		}catch(err) {
			callback(err);
		}

		this.wmival = setInterval(this.save.bind(this),60000);
	}

	/**
	 * Retrieves the next line from the input.
	 * @param {Function} callback - Callback function.
	 */
	async next(callback) {
		if(this.closed) return callback(false);

		let data = this.fetchLine();

		if(data) {
			callback(null,data);
		}
		else {
			try {
				await this.readlines();
				data = this.fetchLine();
				callback(null,data);
			}catch(err) {
				callback(err);
			}
		}
	}

	/**
	 * Stops the FileInput instance and cleans up resources.
	 * @param {Function} callback - Callback function.
	 */
	async stop(callback) {
		clearInterval(this.wmival);
		clearInterval(this.ivalWatch);
		for(let m of this.monitors.values()) {
			m.stop(); // Stop all monitors
		}
		await this.sem.take();
		let closeall = Object.
			keys(this.files).
			map(k=>this.files[k]).
			map(async(file)=>{
				await file.sem.take();
				if(file.fd) await fs.close(file.fd);
				file.sem.leave();
			});
		try {
			await Promise.all(closeall);
		}catch(err) {
			logger.error(err);
		}
		this.sem.leave();

		this.closed = true;
		await this.save();
		setTimeout(callback,1000);
	}

	/**
	 * Generates a unique key for an entry.
	 * @param {Object} entry - The entry object.
	 * @returns {string} The generated key.
	 */
	key(entry) {
		return `${entry.input}:${entry.type}@${entry.path}`;
	}
}

module.exports = FileInput;
