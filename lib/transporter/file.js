const
	Path = require('path'),
	Transporter = require("./"),
	expression = require("jsexpr"),
	fs = require("fs-extra"),
	mkdirp = require('mkdirp');

const MAX_FILES = 500;

class FilePurge {
	constructor(files) {
		this.ival = null;
		this.trs = 0;
		this.files = files;
	}

	take() {
		this.trs++;
		if(this.ival==null) {
			this.ival = setInterval(()=>{
				let files = this.files;
				let keys = Object.keys(this.files);
				if(keys.length<MAX_FILES) return;
				keys.sort((a,b)=>files[a].last - files[b].last);
				keys.splice(0,MAX_FILES);
				keys.forEach(k=>{
					files[k].fd.end();
					delete files[k];
				});
			},60000);
		}
	}

	leave() {
		this.trs--;
		if(!this.trs && this.ival) {
			clearInterval(this.ival);
			this.ival = null;
		}
	}
}

const DEF_CONF = {
	"format" : "${originalMessage}",
	"path" : "./${client.address}.log"
};
const files = {};
const purge = new FilePurge(files);

class FileTransporter extends Transporter {
	constructor(id,type) {
		super(id,type);
	}

	configure(config, callback) {
		config = config || {};

		this.base = config.$path;
		this.path = expression.expr(config.path || DEF_CONF.path);
		this.msg = expression.expr(config.format || DEF_CONF.format);

		callback();
	}

	start(callback) {
		purge.take();
		callback();
	}

	stop(callback) {
		purge.leave();
		callback();
	}

	transport(entry,callback) {
		var path = Path.resolve(this.base,this.path(entry));

		if(!files[path]) {
			var folder = path.split(/\/|\\/);
			if(folder.length>1) folder.pop();
			folder = folder.join("/");
			mkdirp.sync(folder);

			files[path] = {
				path : path,
				last : Date.now(),
				fd : fs.createWriteStream(path,{flags:'a+'})
			};
		}
		var file = files[path];
		var wdata = this.msg(entry);

		file.fd.write(wdata+"\n",(err,res)=>{
			file.last = Date.now();
			callback(err,entry);
		});
	}
}

module.exports = FileTransporter;
