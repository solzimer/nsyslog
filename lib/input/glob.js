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
			this.buffer = Buffer.alloc(1024);
			this.lines = [];
			this.tail = "";
		}
}

class GlobFile extends Input {
	constructor() {
		super();
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
			file.tail += res.buffer.toString('utf8');
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

	async start(callback) {
		try {
			let files = await pglob(this.path,{nodir:true});
			this.files = await Promise.all(files.map(async(path)=>{
				let fd = await fs.open(path,'r');
				return new File(path,fd,0);
			}));
		}catch(err) {
			callback(err);
		}
	}

	async next(callback) {
		
	}

	stop(callback) {
		callback();
	}
}

module.exports = GlobFile;
