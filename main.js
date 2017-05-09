const
	Q = require("q"),
	net = require('net'),
	program = require("commander"),
	extend = require("extend"),
	slparser = require("./lib/syslog-parser"),
	configure = require("./lib/config.js"),
	UDPServer = require("./lib/server/udp.js"),
	moment = require("moment");

/*
configure("./config/cfg001.json",(err,cfg)=>{
	console.log(cfg);
	var server = new UDPServer();
	server.configure({host:"0.0.0.0",port:514,protocol:"udp4"});
	server.start(entry=>{
		entry = extend(entry,slparser(entry.originalMessage));
		cfg.flows.forEach(flow=>{
			var from = flow.from(entry);
			if(from) {
				var tr = cfg.transporters[flow.transporter];
				tr.send(entry);
			}
		});
	});
});
*/

configure("./config/cfg001.json",(err,cfg)=>{
	console.log(cfg);
	var server = new UDPServer();
	server.configure({host:"0.0.0.0",port:514,protocol:"udp4"});
	server.start(entry=>{
		slparser(entry,rentry=>{
			entry = extend(entry,rentry);
			cfg.flows.forEach(flow=>{
				var from = flow.from(entry);
				if(from) {
					var tr = cfg.transporters[flow.transporter];
					tr.send(entry);
				}
			});
		});
	});
});
