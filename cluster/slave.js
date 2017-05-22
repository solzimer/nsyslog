const
	extend = require("extend"),
	parser = require("nsyslog-parser");

const CMD = {
	parse : "parse",
	process : "process"
}

var cfg = null;

function start() {
	process.on('message',(message) => {
		if(message.command==CMD.parse) parseEntry(message);
		else if(message.command==CMD.process) processEntry(message);
		else error(message);
	});
}

function parseEntry(message) {
	var entry = message.entry;
	var id = message.id;
	var res = parser(entry.originalMessage);
	entry = extend(entry,res);
	process.send({id:id,entry:entry});
}

function processEntry(message) {
	var entry = message.entry;
	var idproc = message.extra.idproc;
	var id = message.id;
	cfg.processors[idproc].process(entry,(err,res)=>{
		process.send({id:id,entry:res});
	});
}

module.exports = {
	configure : function(config) {cfg=config;},
	start : start
}
