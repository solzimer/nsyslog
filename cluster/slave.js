const
	extend = require("extend"),
	parser = require("nsyslog-parser");

const CHANNEL = "nsyslog";
const CMD = {
	parse : "parse",
	process : "process"
}

var cfg = null;

function start() {
	process.on('message',(message) => {
		if(message.channel==CHANNEL) {
			if(message.command==CMD.process) processEntry(message);
			else error(message);
		}
	});
	process.send("OK");
}

function error(message) {
	console.error(message);
}

function processEntry(message) {
	var entry = message.entry;
	var idproc = message.options.idproc;
	var idflow = message.options.idflow;
	var id = message.id;
	try {
		cfg.
			flows.find(f=>f.id==idflow).
			processors.find(p=>p.id==idproc).
			process(entry,(err,res)=>{
				process.send({channel:CHANNEL,id:id,entry:res,error:err});
			});
	}catch(err) {
		process.send({channel:CHANNEL,id:id,entry:entry,error:err});
	}
}

module.exports = {
	configure : function(config) {cfg=config;},
	start : start
}
