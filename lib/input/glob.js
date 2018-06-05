const
	Input = require('./'),
	readline = require('readline'),
	fs = require('fs-extra'),
	glob = require('glob');

function pglob(pattern,options) {
	return new Promise((ok,rej)=>{
		glob(pattern,options,(err,files)=>{
			if(err) rej(err); else ok(files);
		});
	});
}

class File {
		constructor(path,fd,wm) {
			this.path = path;
			this.fd = fd;
			this.wm = wm;
			this.buffer = Buffer.alloc(2048);
			this.lines = [];
			this.tail = "";
		}
}

class GlobFile extends Input {
	constructor(id) {
		super(id);
	}

	configure(config) {
		config = config || {};
		this.path = config.path;
	}

	get mode() {
		return Input.MODE.pull;
	}

	readlines() {
		let all = this.files.map(async(file)=>{
			let res = await fs.read(file.fd,file.buffer,0,file.buffer.length);
			file.tail += res.buffer.toString('utf8',0,res.bytesRead);
			let lines = file.tail.split("\n");
			while(lines.length) {
				let line = lines.shift();
				if(lines.length) file.lines.push(line);
				else file.tail = line;
			}
			return file;
		});

		return Promise.all(all);
	}

	fetchLine() {
		let files = this.files, len = files.length;

		for(let i=0;i<len;i++) {
			let file = files.shift();
			files.push(file);
			if(file.lines.length) {
				let data = {
					type : 'glob',
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
			let files = await pglob(this.path,{nodir:true});
			this.files = await Promise.all(files.map(async(path)=>{
				let fd = await fs.open(path,'r');
				return new File(path,fd,0);
			}));
			callback();
		}catch(err) {
			callback(err);
		}
	}

	async next(callback) {
		let files = this.files, len = files.length;
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

module.exports = GlobFile;
