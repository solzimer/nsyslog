const
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

function FileTransporter() {
	this.config = {};
	this.path = function(){return "./out.txt"};
	this.msg = function(entry){return entry.originalMessage};
}

FileTransporter.prototype.configure = function(config,json) {
	config = config || {};
	this.path = expression.expr(config.path || DEF_CONF.path);
	this.msg = expression.expr(config.format || DEF_CONF.format);
}

FileTransporter.prototype.send = function(entry,callback) {
	callback = callback||FNVOID;

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
	if(!wdata) console.log("HAAAAAAA!");
	file.fd.write(wdata+"\n",()=>{
		callback();
	});
}

if(!module.parent) {
	var tr = new FileTransporter();
	tr.configure({"path":"/var/log/${client.address}.log"});

	var i=0;

	var fn = function() {
		tr.send({
			client : {address : "10.192.233.39"},
			originalMessage : "Mensaje de prueba => "+i
		},()=>{
			if(i++<10000) fn();
		});
	}

	fn();
}
else {
	module.exports = FileTransporter;
}
