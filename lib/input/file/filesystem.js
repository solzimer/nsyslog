/**
 * Filesystem Utilities Module
 * Provides file monitoring and management utilities.
 * @module filesystem
 */

const chokidar = require('chokidar'),
	logger = require("../../logger"),
	fs = require('fs-extra'),
	EventEmiter = require('events'),
	Semaphore = require('../../semaphore'),
	extend = require('extend'),
	Path = require('path'),
	glob = require('glob');

const BUFFER = 1024 * 10; // Default buffer size for file reading

/**
 * Promisified glob function.
 * @param {string} pattern - Glob pattern.
 * @param {Object} options - Glob options.
 * @returns {Promise<Array<string>>} List of matching file paths.
 */
function pglob(pattern, options) {
	// Wrap glob in a promise for async/await support
	return new Promise((ok, rej) => {
		glob(pattern, options, (err, files) => {
			if (err) rej(err); else ok(files);
		});
	});
}

/**
 * Translates a file path to use forward slashes.
 * @param {string} path - File path.
 * @returns {string} Translated file path.
 */
function translate(path) {
	// Replace backslashes with forward slashes
	return path.replace(/\\/g, '/');
}

/**
 * File definition
 * Represents a file and its state.
 * @memberof filesystem
 * @class
 */
class File {
	/**
	 * Constructor for File
	 * @param {string} path - File path.
	 * @param {number} fd - File descriptor.
	 * @param {Object} stats - File stats.
	 * @param {number} offset - Current read offset.
	 * @param {number} bufflen - Buffer length.
	 * @param {string} tail - Remaining unprocessed data.
	 * @param {number} line - Current line number.
	 * @param {Array<Object>} lines - List of processed lines.
	 */
	constructor(path, fd, stats, offset, bufflen, tail, line, lines) {
		this.path = path; // File path
		this.filename = Path.basename(path); // Extract filename
		this.fd = fd; // File descriptor
		this.stats = stats; // File stats
		this.offset = offset; // Current read offset
		this.buffer = Buffer.alloc(bufflen || BUFFER); // Allocate buffer
		this.tail = tail || ""; // Remaining unprocessed data
		this.line = line || 0; // Current line number
		this.lines = lines || []; // List of processed lines
		this.sem = new Semaphore(1); // Semaphore for concurrency control
	}

	/**
	 * Converts the file state to a JSON object.
	 * @returns {Object} JSON representation of the file state.
	 */
	toJSON() {
		// Serialize file state
		return {
			path: this.path, offset: this.offset, stats: this.stats,
			tail: this.tail, line: this.line, lines: this.lines
		};
	}
}

/**
 * File Monitor
 * Monitors file changes and emits events.
 * @memberof filesystem
 * @class
 * @extends EventEmiter
 */
class Monitor extends EventEmiter {
	/**
	 * Constructor for Monitor
	 * @param {Object<string, File>} files - Map of monitored files.
	 */
	constructor(files) {
		super();
		this.id = Math.random().toString(36).substring(2, 15); // Unique ID for the monitor
		this.path = null; // Path to monitor
		this.files = files;
		this.readyFiles = {};
		this.sem = new Semaphore(1);
		this.timestamp = Date.now(); // Last access timestamp
	}

	/**
	 * Detects if a file has been renamed.
	 * @param {string} newpath - New file path.
	 * @returns {Promise<string>} Old file path or the same if not renamed.
	 */
	async rename(newpath) {
		// Normalize path
		newpath = translate(newpath);

		let oldpath = newpath;
		let files = this.files;
		let file = files[newpath];

		// File already exists, nothing to do
		if (file) return newpath;

		try {
			await this.sem.take();
	
			// Retrieve stats to search if file has been renamed
			oldpath = newpath;
			let stats = await fs.stat(newpath);
			let oldfile = Object.keys(files).find(k => files[k].stats.ino == stats.ino);
	
			// Renamed file
			if (oldfile) {
				oldfile = files[oldfile];
				oldpath = oldfile.path;
				try {
					if (oldfile.fd) {
						await fs.close(oldfile.fd);
						oldfile.fd = null;
					}
				} catch (err) {
					logger.error(err);
				}
				try {
					oldfile.fd = await fs.open(newpath, 'r');
				} catch (err) {
					logger.error(err);
				}
				oldfile.path = newpath;
				delete files[oldpath];
				files[newpath] = oldfile;
				files[newpath].moved = true;
			}
		}finally {
			this.sem.leave();
		}

		return oldpath;
	}

	/**
	 * Handles file unlink events.
	 * @param {string} path - File path.
	 * @returns {Promise<boolean>} True if the file was removed, false otherwise.
	 */
	async unlink(path) {
		// Normalize path
		path = translate(path);

		let files = this.files;
		let file = files[path];

		await this.sem.take();

		// File exist, remove watermark
		if (file) {
			if (file.moved) {
				delete file.moved;
				file = null;
			}
			else {
				try {
					fs.close(file.fd, (err) => { });
				} catch (err) { }
				delete files[path];
			}
		}

		this.sem.leave();

		return !!file;
	}

	/**
	 * Starts the file watcher.
	 * @param {string} path - Path to monitor.
	 * @param {Object} cfg - Watcher configuration.
	 */
	async startWatcher(path, cfg) {
		// Normalize path
		path = translate(path);

		if (this.watcher) {
			await this.watcher.close();
		}

		let files = this.files;

		cfg = extend(true, cfg, {
			alwaysStat: true,
			ignoreInitial: false,
			disableGlobbing: false,
			ignorePermissionErrors: true,
			awaitWriteFinish : cfg.awaitWriteFinish || { stabilityThreshold: 2000 }
		});

		logger.info('Starting file monitor with options', cfg);
		this.watcher = chokidar.watch(path, cfg);

		this.watcher.on('add', async (newpath) => {
			// Normalize path
			newpath = translate(newpath);

			let oldpath = await this.rename(newpath);
			if (newpath == oldpath) {
				logger.info(`Monitoring new file: ${newpath}`);
			}
			else {
				logger.info(`File ${oldpath} renamed to ${newpath}`);
			}

			if (files[newpath]) {
				this.files[newpath].ready = true;
				this.emit('ready', newpath);
			}
			else this.emit('new', newpath);
		});

		this.watcher.on('unlink', async (path) => {
			// Normalize path
			path = translate(path);

			let del = await this.unlink(path);
			if (del) {
				logger.info(`File ${path} deleted or moved to a non watched path`);
			}
		});

		this.watcher.on('change', async (path) => {
			// Normalize path
			path = translate(path);

			if (this.files[path]) this.files[path].ready = true;
			this.emit('ready', path);
		});

		this.watcher.on('addDir', path => {
			// Normalize path
			path = translate(path);

			this.watcher.add(path);
			logger.info(`Monitoring dir: ${path}`);
		});

		this.watcher.on('all', (evt, path) => {
			// Normalize path
			path = translate(path);

			logger.debug(evt, path);
		});
	}

	/**
	 * Starts monitoring files.
	 * @param {string} path - Path to monitor.
	 * @param {Object} cfg - Watcher configuration.
	 */
	start(path, cfg) {
		this.path = path;
		this.startWatcher(path, cfg);
		this.ival = setInterval(() => {
			logger.debug(`FileWatcher [${path}]=> `,this.watcher.getWatched());
			this.watcher.add(path);
		}, 5000);
	}

	/**
	 * Stops the file watcher.
	 */
	stop() {
		clearInterval(this.ival);
		this.watcher.close();
	}
}

/**
 * @namespace filesystem
 */
module.exports = {
	glob: pglob,
	File: File,
	Monitor: Monitor
};
