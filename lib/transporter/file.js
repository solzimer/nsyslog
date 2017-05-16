const
	Writable = require('stream').Writable;
	expression = require("../expression.js"),
	fs = require("fs"),
	mkdirp = require('mkdirp'),
	moment = require("moment");

const DEF_CONF = {
	"format" : "${originalMessage}",
	"path" : "./${client.address}.log"
}
const FNVOID = function(){};

var files = {};

class FileTransporter extends Writable {

	constructor(config) {
		config = config || {};

		super(config);
		this.path = expression.expr(config.path || DEF_CONF.path);
		this.msg = expression.expr(config.format || DEF_CONF.format);
	}

	_write(entry,encoding,callback) {
		var path = this.path(entry);

		if(!files[path]) {
			var folder = path.split(/\/|\\/);
			if(folder.length>1) folder.pop();
			folder = folder.join("/");
			mkdirp.sync(folder);

			files[path] = {
				path : path,
				last:moment(),
				fd:fs.createWriteStream(path,{flags:'a+'})
			};
		}
		var file = files[path];
		var wdata = this.msg(entry);

		file.fd.write(wdata+"\n",()=>{
			callback();
		});
	}
}

module.exports = FileTransporter;
