const
	extend = require('extend'),
	chokidar = require('chokidar'),
	minimatch = require('minimatch'),
	logger = require("../../logger"),
	fs = require('fs-extra'),
	EventEmiter = require('events'),
	Semaphore = require('../../semaphore'),
	Path = require('path'),
	glob = require('glob');

const BUFFER = 1024 * 10;

function pglob(pattern,options) {
	return new Promise((ok,rej)=>{
		glob(pattern,options,(err,files)=>{
			if(err) rej(err); else ok(files);
		});
	});
}

/**
 * File definition
 * @memberof filesystem
 * @class
 */
class File {
	constructor(path,fd,stats,offset,bufflen,tail,line,lines) {
		this.path = path;
		this.filename = Path.basename(path);
		this.fd = fd;
		this.stats = stats;
		this.offset = offset;
		this.buffer = Buffer.alloc(bufflen||BUFFER);
		this.tail = tail || "";
		this.line = line || 0;
		this.lines = lines || [];
		this.sem = new Semaphore(1);
	}
	toJSON() {
		return {
			path: this.path, offset: this.offset,	stats: this.stats,
			tail: this.tail, line: this.line, lines: this.lines
		};
	}
}

/**
 * File Monitor
 * @memberof filesystem
 * @class
 * @extends EventEmiter
 */
class Monitor extends EventEmiter {
	constructor(files) {
		super();
		this.files = files;
		this.readyFiles = {};
		this.sem = new Semaphore(1);
	}

	/**
	 * Detects a renamed file
	 * @param  {string}  newpath new found file. If a monitored file shares this
	 * new file's inode, it's the same file that has been renamed
	 * @return {Promise} Returns the old file's path (the same if file
	 * has not been renamed)
	 */
	async rename(newpath) {
		let files = this.files;
		let file = files[newpath];

		// File already exists, nothing to do
		if(file) return newpath;

		await this.sem.take();

		// Retrieve stats to search if file has been renamed
		let oldpath = newpath;
		let stats = await fs.stat(newpath);
		let oldfile = Object.keys(files).find(k=>files[k].stats.ino==stats.ino);

		// Renamed file
		if(oldfile) {
			oldfile = files[oldfile];
			oldpath = oldfile.path;
			await fs.close(oldfile.fd);
			oldfile.fd = await fs.open(newpath,'r');
			oldfile.path = newpath;
			delete files[oldpath];
			files[newpath] = oldfile;
			files[newpath].moved = true;
		}

		this.sem.leave();
		return oldpath;
	}

	async unlink(path) {
		let files = this.files;
		let file = files[path];

		await this.sem.take();

		// File exist, remove watermark
		if(file) {
			if(file.moved) {
				delete file.moved;
				file = null;
			}
			else {
				fs.close(file.fd,(err)=>{});
				delete files[path];
			}
		}

		this.sem.leave();

		return !!file;
	}

	start(path) {
		let files = this.files;
		this.watcher = chokidar.watch(path);

		this.watcher.on('add',async(newpath)=>{
			let oldpath = await this.rename(newpath);
			if(newpath==oldpath) {
				logger.info(`Monitoring new file: ${newpath}`);
			}
			else {
				logger.info(`File ${oldpath} renamed to ${newpath}`);
			}

			if(files[newpath]) this.files[newpath].ready = true;
			else this.emit('new',newpath);
		});

		this.watcher.on('unlink',async(path)=>{
			let del = await this.unlink(path);
			if(del) {
				logger.info(`File ${path} deleted or moved to a non watched path`);
			}
		});

		this.watcher.on('change',async(path)=>{
			if(this.files[path]) this.files[path].ready = true;
			this.emit('ready',path);
		});

		this.watcher.on('addDir',path=>{
			this.watcher.addDir(path);
			logger.info(`Monitoring dir: ${path}`);
		});

		this.watcher.on('all',(evt,path)=>{
			logger.debug(evt,path);
		});
	}

	stop() {
		this.watcher.close();
	}
}

/**
 * @namespace filesystem
 */
module.exports = {
	glob : pglob,
	File : File,
	Monitor : Monitor
};
