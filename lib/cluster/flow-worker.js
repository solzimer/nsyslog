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
			case CMD.stop :
				process.send({module,cmd:CMD.success});
				await finalize();
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

	cfg = await NSyslog.readConfig(cfg.$$raw || cfg);
	if(cfg.$$errors) {
		cfg.$$errors.forEach(err=>{
			logger.error(`[${idFlow}] ${err.err.message || err.err}`);
		});
	}
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

async function finalize() {
	logger.info('Stoping worker flow process => '+process.pid);
	if(instance) {
		try {await instance.stop();}catch(err){logger.error(err);}
		setTimeout(()=>process.exit(1),500);
	}
}
process.send({module:MODULE,cmd:CMD.online});
