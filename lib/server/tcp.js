const
	net = require('net'),
	slparser = require("nsyslog-parser"),
	moment = require("moment");

const DEFAULTS = {
	host : "localhost",
	port : 514,
	protocol : "udp4"
}

function Server() {
	var host = DEFAULTS.host;
	var port = DEFAULTS.port;
	var protocol = DEFAULTS.protocol;
	var server = null;
	var ival = null;

	this.configure = function(config) {
		config = config || {};
		host = config.host || DEFAULTS.host;
		port = config.port || DEFAULTS.port;
		protocol = config.protocol || DEFAULTS.protocol;
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
						//var logLine = new Line.LogLine({line:getSeq(), timestamp:Date.now(), host:s.sock.remoteAddress, sip:s.sock.remoteAddress,	message:s.buffer});
						//queue.push(logLine);
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
					//var logLine = new Line.LogLine({line:getSeq(), timestamp:Date.now(), host:sock.remoteAddress, sip:sock.remoteAddress, message:line});
					//queue.push(logLine);
				});
			});

			sock.on('close', data => {
				//var logLine = new Line.LogLine({line : getSeq(), timestamp:Date.now(), host: sock.remoteAddress, sip : sock.remoteAddress, message:s.msg});
				delete sockets[s.sid];
				//queue.push(logLine);
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
