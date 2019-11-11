const
	cluster = require('./'),
	logger = require('../logger'),
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
	event : "event",
	stats : "stats",
};

if(module.parent) {
	module.exports = {CMD, MODULE};
	return;
}

const
	NSyslog = require('../nsyslog'),
	Stats = require('../stats'),
	cli = require('../cli'),
	{Config} = NSyslog.Core;

var instance = null;
const stats = Stats.fetch('main');

cluster.on(MODULE,async (process,module,msg)=>{
	try {
		switch(msg.cmd) {
			case CMD.start :
				await start(msg.cfg,msg.flow);
				process.send({module,cmd:CMD.success});
				break;
			case CMD.emit :
				push(msg.entry,()=>process.send({module,cmd:CMD.ack,cid:msg.cid}));
				break;
			default :
				throw new Error(`Unkown command ${msg.cmd}`);
		}
	}catch(err) {
		process.send({module,cmd:CMD.error,error:err.message,cid:msg.cid||null});
	}
});

async function start(cfg, idFlow) {
	logger.info(`Starting child process ${idFlow} : ${process.pid}`);

	instance = new NSyslog(cfg);
	cli({nsyslog:instance});

	setInterval(()=>{
		process.send({module:MODULE,cmd:CMD.stats,stats:stats.all()});
		stats.clean();
	},1000);

	await instance.start();
}

function push(entry,callback) {
	instance.push(entry,callback);
}

process.send({module:MODULE,cmd:CMD.online});
