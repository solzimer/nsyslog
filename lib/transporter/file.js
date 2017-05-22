const
	Transform = require('stream').Transform;
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

class FileTransporter extends Transform {

	constructor(config) {
		config = config || {};

		super(config);
		this.path = expression.expr(config.path || DEF_CONF.path);
		this.msg = expression.expr(config.format || DEF_CONF.format);
	}

	_transform(entry,encoding,callback) {
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

		console.log("I => ",this.i);
		file.fd.write(wdata+"\n",(err,res)=>{
			console.log("J =>",this.j);
			callback(err,entry);
		});
	}
}

module.exports = FileTransporter;
