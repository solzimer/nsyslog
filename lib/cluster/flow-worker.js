const
	cluster = require('cluster');

const CMD = {
	config : "config",
	start : "start",
	stop : "stop",
	emit : "emit",
	ack : "ack",
	online : "online",
	success : "success",
	error : "error",
	event : "event"
}

if(module.parent) {
	module.exports = {CMD};
	return;
}

const
	NSyslog = require('../nsyslog'),
	Queue = require('../queue'),
	{Writable,Readable,Duplex} = require('stream'),
	{Config,Input,Processor,Transporter,Factory,InputWrapper} = NSyslog.Core;

var instance = null;

process.on('message',async (msg)=>{
	try {
		switch(msg.cmd) {
			case CMD.start :
				await start(msg.path,msg.flow);
				process.send({cmd:CMD.success});
				break;
			case CMD.emit :
				push(msg.entry);
				process.send({cmd:CMD.ack,cid:msg.cid});
				break;
			default :
			 throw new Error(`Unkown command ${msg.cmd}`);
		}
	}catch(err) {
		process.send({cmd:CMD.error,error:err.message,cid:msg.cid||null});
	}
});

async function start(path, idFlow) {
	let cfg = await Config.read(path);
	cfg.inputs = {};
	cfg.modules.inputs = {};
	cfg.flows = cfg.flows.filter(f=>f.id==idFlow);
	cfg.flows.forEach(f=>f.fork=false);
	instance = new NSyslog(cfg);

	instance.on('data',(stage,flow,module,entry)=>{
		process.send({cmd:CMD.event, event:'data', args : [stage,flow.id,module.instance.id]});
	});

	instance.on('error',(stage,flow,module,error)=>{
		process.send({cmd:CMD.event, event:'error', args : [stage,flow.id,module.id,error.message]});
	});

	await instance.start();
}

function push(entry) {
	instance.push(entry);
}

process.send({cmd:CMD.online});
