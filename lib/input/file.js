const
	Input = require('./'),
	Semaphore = require('../semaphore'),
	readline = require('readline'),
	fs = require('fs-extra'),
	extend = require('extend'),
	chokidar = require('chokidar'),
	logger = require("../logger"),
	watermark = require("../watermark"),
	glob = require('glob');

const BUFFER = 1024;

const MODE = {
	offset : "offset",
	watermark : "watermark"
}

const OFFSET = {
	end : "end",
	begin : "begin",
	start : "begin"
}

function pglob(pattern,options) {
	return new Promise((ok,rej)=>{
		glob(pattern,options,(err,files)=>{
			if(err) rej(err); else ok(files);
		});
	});
}

class File {
	constructor(path,fd,stats,offset,bufflen,tail,line,lines) {
		this.path = path;
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
		}
	}
}

class FileInput extends Input {
	constructor(id) {
		super(id);
		this.files = {};
		this.sem = new Semaphore(1);
		this.wm = null;
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
					else if(this.offset==MODE.begin) offset = 0;
					else offset = stats.size;
				}
			}
			else if(this.readmode==MODE.offset) {
				if(idx>=0) offset = idx;
				else if(this.offset==MODE.begin) offset = 0;
				else offset = stats.size;
			}

			files[path] = new File(path,fd,stats,offset,null,tail,line,lines);
			extend(true,wm,{[path]:files[path].toJSON()});
		}

		sem.leave();
		return files[path];
	}

	readlines() {
		let files = Object.keys(this.files).map(k=>this.files[k]);

		let all = files.map(async(file)=>{
			let res = await fs.read(file.fd,file.buffer,0,file.buffer.length);
			file.tail += res.buffer.toString('utf8',0,res.bytesRead);
			let lines = file.tail.split("\n");
			while(lines.length) {
				let line = lines.shift();
				if(lines.length) file.lines.push(line);
				else file.tail = line;
			}
			extend(true,this.wm,{[file.path]:file.toJSON()});
			return file;
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

			}
			else {
				let files = await pglob(this.path,{nodir:true});
				await Promise.all(files.map(path=>this.openFile(path)));
			}
			callback();
		}catch(err) {
			callback(err);
		}
	}

	async next(callback) {
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

	stop(callback) {
		callback();
	}
}

module.exports = FileInput;
