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
	event : "event",
	stats : "stats"
}

if(module.parent) {
	module.exports = {CMD, MODULE};
	return;
}

const
	NSyslog = require('../nsyslog'),
	Stats = require('../stats'),
	{Config} = NSyslog.Core;

var instance = null;
const stats = Stats.fetch('main');

cluster.on(MODULE,async (process,module,msg)=>{
	try {
		switch(msg.cmd) {
			case CMD.start :
				await start(msg.path,msg.flow);
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

async function start(path, idFlow) {
	let cfg = await Config.read(path);

	// Filter non attached inputs
	cfg.inputs = Object.keys(cfg.inputs).reduce((map,key)=>{
		let input = cfg.inputs[key];
		if(input.attach && input.attach.indexOf(idFlow)>=0)
			map[key] = input;
		return map;
	},{});

	// Filter non attached inputs
	cfg.modules.inputs = Object.keys(cfg.modules.inputs).reduce((map,key)=>{
		let input = cfg.modules.inputs[key];
		if(input.$def.attach && input.$def.attach.indexOf(idFlow)>=0)
			map[key] = input;
		return map;
	},{});

	cfg.flows = cfg.flows.filter(f=>f.id==idFlow);
	cfg.flows.forEach(f=>f.fork=false);
	instance = new NSyslog(cfg);

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
