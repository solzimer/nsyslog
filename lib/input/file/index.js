const
	Input = require('../'),
	Semaphore = require('../../semaphore'),
	readline = require('readline'),
	fs = require('fs-extra'),
	Path = require('path'),
	extend = require('extend'),
	minimatch = require('minimatch'),
	slash = require('slash'),
	logger = require("../../logger"),
	Watermark = require("../../watermark"),
	filesystem = require("./filesystem"),
	File =  filesystem.File,
	Monitor = filesystem.Monitor,
	glob = filesystem.glob;

const BUFFER = 1024 * 10;

const MODE = {
	offset : "offset",
	watermark : "watermark"
}

const OFFSET = {
	end : "end",
	begin : "begin",
	start : "start"
}

/**
 * File Reader Input
 * @class
 * @extends Input
 */
class FileInput extends Input {
	constructor(id,type) {
		super(id,type);
		/**
		 * File map
		 * @type {Object<String,filesystem.File>}
		 */
		this.files = {};
		this.list = {read:{},avail:{}}
		this.sem = new Semaphore(1);

		/**
		 * Innser watermark instance
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
		 * @type {filesystem.Monitor}
		 */
		this.monitor = null;
	}

	async configure(config, callback) {
		config = config || {};
		this.path = slash(Path.resolve(config.$path, config.path));
		if(config.exclude)
			this.exclude = slash(Path.resolve(config.$path, config.exclude));
		this.readmode = config.readmode || MODE.offset;
		this.offset = config.offset || MODE.end;
		this.encoding = config.encoding || 'utf8';
		this.watch = config.watch || false;
		this.blocksize = config.blocksize || BUFFER;
		this.config = config;
		callback();
	}

	get mode() {
		return Input.MODE.pull;
	}

	async watermarks() {
		return Object.keys(this.wm||{}).filter(k=>k!="_id").map(k=>{
			return {
				key : `${this.id}:${this.type}@${k}`,
				long : this.wm[k].stats.size,
				current : this.wm[k].offset,
			}
		});
	}

	async save() {
		await this.sem.take();

		try {
			Object.keys(this.files).map(k=>this.files[k]).forEach(file=>{
				this.wm[file.path] = file.toJSON();
			});
			if(this.watermark)
				this.watermark.save(this.wm);
		}catch(err) {
			logger.error(err);
		}

		this.sem.leave();
	}

	sanityzeFiles() {
		Object.keys(this.list.avail).filter(path=>!this.files[path]).forEach(rp=>delete this.list.avail[rp]);
		Object.keys(this.list.read).filter(path=>!this.files[path]).forEach(rp=>delete this.list.read[rp]);
	}

	async openFile(path) {
		let files = this.files, sem = this.sem, wm = this.wm;

		// Excluded files
		if(this.exclude && minimatch(path,this.exclude)) {
			logger.info(`${path} is excluded`);
			return;
		}

		await sem.take();

		if(!files[path] || !files[path].fd) {
			let tail = "", offset = 0, line = 0, lines = [];
			let fd = await fs.open(path,'r');
			let stats = await fs.fstat(fd);
			let buffer = this.blocksize;
			let idx = parseInt(this.offset);

			if(this.readmode==MODE.watermark) {
				if(wm[path]) {
					offset = wm[path].offset || 0;
					tail = wm[path].tail || "";
					line = wm[path].line || 0;
					lines = wm[path].lines || [];
				}
				else {
					if(idx>=0) offset = idx;
					else if(this.offset==OFFSET.begin) offset = 0;
					else if(this.offset==OFFSET.start) offset = 0;
					else offset = stats.size;
				}
			}
			else if(this.readmode==MODE.offset) {
				if(idx>=0) offset = idx;
				else if(this.offset==OFFSET.begin) offset = 0;
				else if(this.offset==OFFSET.start) offset = 0;
				else offset = stats.size;
			}

			files[path] = new File(path,fd,stats,offset,buffer,tail,line,lines);
			files[path].ready = true;
			this.list.read[path]=true;
			extend(true,wm,{[path]:files[path].toJSON()});
		}

		sem.leave();
		return files[path];
	}

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
							logger.silly(`Nothing to read from ${file.path}`);
							file.ready = false;
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
		}

		if(!file.lines.length)
			delete this.list.avail[file.path];

		return data;
	}

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
				this.monitor = new Monitor(this.files);
				this.monitor.start(this.path);
				this.monitor.on('new',path=>this.openFile(path));
				this.monitor.on('ready',path=>this.list.read[path]=true);
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

	async next(callback) {
		await new Promise(ok=>setTimeout(ok,500));
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

	async stop(callback) {
		clearInterval(this.wmival);
		if(this.monitor) this.monitor.stop();
		await this.sem.take();
		let closeall = Object.
			keys(this.files).
			map(k=>this.files[k]).
			map(async(file)=>{
				await file.sem.take();
				await fs.close(file.fd);
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

	key(entry) {
		return `${entry.input}:${entry.type}@${entry.path}`;
	}
}

module.exports = FileInput;
