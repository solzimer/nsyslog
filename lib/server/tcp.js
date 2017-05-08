const
	net = require('net'),
	slparser = require("nsyslog-parser"),
	moment = require("moment");

const DEFAULTS = {
	host : "0.0.0.0",
	port : 514,
	protocol : "tcp4"
}

function Server() {
	var host = DEFAULTS.host;
	var port = DEFAULTS.port;
	var protocol = DEFAULTS.protocol;
	var server = null;
	var eserver = {};
	var ival = null;

	function parse(sock,message) {
		var entry = slparser(message);
		entry.server = eserver;
		entry.client = {address : sock.remoteAddress};
		return entry;
	}

	this.configure = function(config) {
		config = config || {};
		host = config.host || DEFAULTS.host;
		port = config.port || DEFAULTS.port;
		protocol = config.protocol || DEFAULTS.protocol;
		eserver = {protocol : protocol, port : port, interface : host};
	}

	this.start = function(callback) {
		const RX = /<\d+>[^<]+/g;
		var sockets = [];

		ival = setInterval(()=>{
			var tf = Date.now();
			for(var sid in sockets) {
				var s = sockets[sid];
				if((tf-s.t)>=BUFFER_TO) {
					if(s.buffer.length) {
						callback(parse(s.sock,s.buffer));
					}
					s.buffer = "";
				}
			}
		},BUFFER_IVAL);

		server = net.createServer(sock => {
			var s = {t:Date.now(),buffer:"",msg:"",sock:sock};
			var sid = s.t + "_" + Math.random()*1000;
			s.sid = sid;
			sockets[sid] = s;

			sock.on('data', data => {
				s.t = Date.now();
				s.buffer += data.toString();
				s.msg += data.toString();

				if(!s.buffer.startsWith("<")) {
					s.buffer = ""; return;
				}
				var lines = s.buffer.match(RX);
				lines = lines||[];
				s.buffer = lines.pop();

				lines.forEach(line=>{
					callback(parse(s.sock,line));
				});
			});

			sock.on('close', data => {
				callback(parse(s.sock,s.msg));
				delete sockets[s.sid];
			});

			sock.on('error', err => {
				self.log("Error => "+err.message)
			});

		}).listen(port, host);
	}

	this.stop = function(callback) {
		clearInterval(ival);
	}
}

module.exports = Server;
