const
	Q = require("q"),
	dgram = require('dgram'),
	net = require('net'),
	program = require("commander"),
	slparser = require("nsyslog-parser"),
	configure = require("./lib/config.js"),
	moment = require("moment");

function initUDP(host,port,protocol,callback) {
	var server = dgram.createSocket(protocol);
	var eserver = {protocol : protocol, port : port, interface : host};

	server.on('listening', ()=>{var address = server.address()});
	server.on('message', (message, remote)=>{
		var entry = slparser(message.toString());
		entry.server = eserver;
		entry.client = {
			address : remote.address
		}
		callback(entry);
	});
	server.on("error", err => {server.close()});
	server.bind(port, host);
}

/*
function initTCP(host,port,protocol) {
	const RX = /<\d+>[^<]+/g;
	var sockets = [], dellist = [];

	setInterval(()=>{
		var tf = Date.now();
		for(var sid in sockets) {
			var s = sockets[sid];
			if((tf-s.t)>=BUFFER_TO || dellist[sid]) {
				if(s.buffer.length) {
					var logLine = new Line.LogLine({
						line : getSeq(),
						timestamp:Date.now(),
						host: s.sock.remoteAddress,
						sip: s.sock.remoteAddress,
						message:s.buffer
					});
					queue.push(logLine);
				}
				s.buffer = "";
			}
		}
		for(var sid in dellist) {
			delete sockets[sid];
		}
	},BUFFER_IVAL);

	var server = net.createServer(sock => {
		var s = {t:Date.now(),buffer:"",sock:sock};
		var sid = s.t + "_" + Math.random()*1000;
		sockets[sid] = s;
		delete dellist[sid];

		sock.on('data', data => {
			s.t = Date.now();
			s.buffer += data.toString();
			if(!s.buffer.startsWith("<")) {
				s.buffer = ""; return;
			}
			var lines = s.buffer.match(RX);
			lines = lines||[];
			s.buffer = lines.pop();

			lines.forEach(line=>{
				var logLine = new Line.LogLine({
					line : getSeq(),
					timestamp:Date.now(),
					host: sock.remoteAddress,
					sip : sock.remoteAddress,
					message:line
				});
				queue.push(logLine);
			});
		});

		sock.on('close', data => {
			dellist[sid] = true;
			self.log("Close")
		});

		sock.on('error', err => {
			self.log("Error => "+err.message)
		});

	}).listen(port, host);
}
*/

configure("./config/cfg001.json",(err,cfg)=>{
	console.log(cfg);
	initUDP("0.0.0.0",514,"udp4",entry=>{
		cfg.flows.forEach(flow=>{
			var from = flow.from;
			var fn = cfg.filters[from];
			if(fn(entry)) {
				var tr = cfg.transporters[flow.transporter];
				tr.send(entry);
			}
		});
	});
});
