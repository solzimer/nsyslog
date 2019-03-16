const
	cluster = require('./'),
	MODULE = "flow-fork";

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
	module.exports = {CMD, MODULE};
	return;
}

const
	NSyslog = require('../nsyslog'),
	Queue = require('../queue'),
	{Writable,Readable,Duplex} = require('stream'),
	{Config,Input,Processor,Transporter,Factory,InputWrapper} = NSyslog.Core;

var instance = null;

cluster.on(MODULE,async (process,module,msg)=>{
	try {
		switch(msg.cmd) {
			case CMD.start :
				await start(msg.path,msg.flow);
				process.send({module,cmd:CMD.success});
				break;
			case CMD.emit :
				push(msg.entry,()=>{
					process.send({module,cmd:CMD.ack,cid:msg.cid});
				});
				break;
			default :
			 throw new Error(`Unkown command ${msg.cmd}`);
		}
	}catch(err) {
		process.send({module,cmd:CMD.error,error:err.message,cid:msg.cid||null});
	}
});

async function start(path, idFlow) {
	let cfg = await Config.read(path);
	cfg.inputs = {};
	cfg.modules.inputs = {};
	cfg.flows = cfg.flows.filter(f=>f.id==idFlow);
	cfg.flows.forEach(f=>f.fork=false);
	instance = new NSyslog(cfg);

	let count = 0, ti = Date.now();
	instance.on('data',(stage,flow,module,entry)=>{
		process.send({module:MODULE,cmd:CMD.event, event:'stream_data', args : [stage,flow.id,module.instance.id]});
	});

	instance.on('ack',(stage,flow,module,entry)=>{
		process.send({module:MODULE,cmd:CMD.event, event:'stream_ack', args : [stage,flow.id,module.instance.id]});
	});

	instance.on('error',(stage,flow,module,error)=>{
		process.send({module:MODULE,cmd:CMD.event, event:'stream_error', args : [stage,flow.id,module.id,error.message]});
	});

	await instance.start();
}

function push(entry,callback) {
	instance.push(entry,callback);
}

process.send({module:MODULE,cmd:CMD.online});
