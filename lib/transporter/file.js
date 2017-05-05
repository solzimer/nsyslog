const
	expression = require("../expression.js"),
	fs = require("fs"),
	mkdirp = require('mkdirp'),
	moment = require("moment");

const DEF_CONF = {
	"format" : "${originalMessage}",
	"path" : "./${client.address}.log"
}

var files = {};

function FileTransporter() {
	this.config = {};
	this.path = function(){return "./out.txt"};
	this.msg = function(entry){return entry.originalMessage};
}

FileTransporter.prototype.configure = function(config) {
	config = config || {};
	this.path = expression(config.path || DEF_CONF.path);
	this.msg = expression(config.format || DEF_CONF.format);
}

FileTransporter.prototype.send = function(entry,callback) {
	var path = this.path(entry);
	if(!files[path]) {
		var folder =
		files[path] = {
			path : path,
			last:moment(),
			fd:fs.createWriteStream(path,{flags:'a+'})
		};
	}
	var file = files[path];
	file.fd.write(this.msg(entry)+"\n",()=>{
		callback();
	});
}

if(!module.parent) {
	var tr = new FileTransporter();
	tr.configure({"path":"'/var/log/nsyslog/'+${client.address}+'.log'"});

	var i=0;

	var fn = function() {
		tr.send({
			client : {address : "10.192.233.39"},
			originalMessage : "Mensaje de prueba => "+i
		},()=>{
			if(i++<1000000) fn();
		});
	}

	fn();
}
