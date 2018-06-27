const
	Input = require('./'),
	Semaphore = require('../semaphore'),
	readline = require('readline'),
	fs = require('fs-extra'),
	extend = require('extend'),
	logger = require("../logger"),
	watermark = require("../watermark"),
	filesystem = require("./filesystem"),
	File =  filesystem.File,
	Monitor = filesystem.Monitor,
	glob = filesystem.glob;

const BUFFER = 1024 * 1024;

const MODE = {
	offset : "offset",
	watermark : "watermark"
}

const OFFSET = {
	end : "end",
	begin : "begin",
	start : "start"
}

class FileInput extends Input {
	constructor(id) {
		super(id);
		this.files = {};
		this.sem = new Semaphore(1);
		this.wm = null;
		this.monitor = null;
	}

	configure(config) {
		super.configure(config);
		config = config || {};
		this.path = config.path;
		this.readmode = config.readmode || MODE.offset;
		this.offset = config.offset || MODE.end;
		this.encoding = config.encoding || 'utf8';
		this.watch = config.watch || false;
	}

	get mode() {
		return Input.MODE.pull;
	}

	async save() {
		await this.sem.take();

		try {
			Object.keys(this.files).map(k=>this.files[k]).forEach(file=>{
				this.wm[file.path] = file.toJSON();
			});
			watermark.save(this.wm);
		}catch(err) {
			logger.error(err);
		}

		this.sem.leave();
	}


	async openFile(path) {
		let files = this.files, sem = this.sem, wm = this.wm;

		await sem.take();

		if(!files[path] || !files[path].fd) {
			let tail = "", offset = 0, line = 0, lines = [];
			let fd = await fs.open(path,'r');
			let stats = await fs.fstat(fd);
			let buffer = Buffer.alloc(BUFFER);
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

			files[path] = new File(path,fd,stats,offset,null,tail,line,lines);
			files[path].ready = true;
			extend(true,wm,{[path]:files[path].toJSON()});
		}

		sem.leave();
		return files[path];
	}

	readlines() {
		let files = Object.keys(this.files).
			map(k=>this.files[k]).
			filter(f=>this.watch?f.ready:true);

		let all = files.map(async(file)=>{
			try {
				await this.openFile(file.path);
				await file.sem.take();
				let res = await fs.read(file.fd,file.buffer,0,file.buffer.length,file.offset);
				file.tail += res.buffer.toString('utf8',0,res.bytesRead);
				file.offset += res.bytesRead;
				file.ready = res.bytesRead>0;
				let lines = file.tail.split("\n");
				while(lines.length) {
					let line = lines.shift();
					if(lines.length) file.lines.push(line);
					else file.tail = line;
				}
				this.wm[file.path] = file.toJSON();
				file.sem.leave();
				return file;
			}catch(err) {
				file.sem.leave();
				throw err;
			}
		});

		return Promise.all(all);
	}

	fetchLine() {
		let
			files = Object.keys(this.files).map(k=>this.files[k]),
			len = files.length;

		for(let i=0;i<len;i++) {
			let file = files.shift();
			files.push(file);
			if(file.lines.length) {
				let data = {
					type : 'file',
					path : file.path,
					originalMessage : file.lines.shift()
				}
				return data;
			}
		}

		return false;
	}

	async start(callback) {
		try {
			this.wm = await watermark.get(this.id);

			if(this.watch) {
				this.monitor = new Monitor(this.files);
				this.monitor.start(this.path);
				this.monitor.on('new',path=>this.openFile(path));
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
		this.monitor.stop();
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
}

module.exports = FileInput;
