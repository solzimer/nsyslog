const
	Transporter = require("./"),
	expression = require("jsexpr"),
	fs = require("fs"),
	mkdirp = require('mkdirp'),
	moment = require("moment");

const DEF_CONF = {
	"format" : "${originalMessage}",
	"path" : "./${client.address}.log"
}
const FNVOID = function(){};

var files = {};

class FileTransporter extends Transporter {
	constructor(id) {
		super(id);
	}

	configure(config, callback) {
		config = config || {};

		this.path = expression.expr(config.path || DEF_CONF.path);
		this.msg = expression.expr(config.format || DEF_CONF.format);

		callback();
	}

	transport(entry,callback) {
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

		file.fd.write(wdata+"\n",(err,res)=>{
			callback(err,entry);
		});
	}
}

module.exports = FileTransporter;
