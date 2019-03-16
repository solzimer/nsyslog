const
	cluster = require('./'),
	worker = require('./flow-worker'),
	logger = require('../logger'),
	PQueue = require('promise-stream-queue'),
	Semaphore = require('../semaphore'),
	Queue = require('../queue'),
	Duplex = require('stream').Duplex,
	{CMD,MODULE} = worker;

const
	SCRIPT = `${__dirname}/flow-worker`,
	HWM = 1000;

function forkChild(path,flow) {
	let child = cluster.fork(SCRIPT,['--flow',flow]);
	child.ready = new Promise(async(resolve,reject)=>{
		function hdl(child,module,msg) {
			if(msg.cmd==CMD.online) {
				child.send({module,cmd:CMD.start,path,flow});
			}
			else if(msg.cmd==CMD.success) {
				cluster.off(module,child,hdl);
				resolve();
			}
			else {
				cluster.off(module,child,hdl);
				reject(msg.error || msg);
			}
		}
		cluster.on(MODULE,child,hdl);
	});

	return child;
}

function forkFlow(path,flowId) {
	let sem = new Semaphore(HWM);
	let cid = 0;

	let child = forkChild(path,flowId);
	child.on('error',logger.error.bind(logger));
	child.on('close',code=>logger.info(`Child closed with code: ${code}`));
	cluster.on(MODULE,child,(child,module,msg)=>{
		let cid = msg.cid, hasCid = (cid!==undefined);
		if(msg.cmd == CMD.error && !hasCid) {
			logger.error(msg.error);
		}
		else if(msg.cmd == CMD.ack && hasCid) {
			sem.leave();
		}
		else if(msg.cmd == CMD.error && hasCid) {
			sem.leave();
		}
		else if(msg.cmd == CMD.event) {
			str.emit(msg.event,msg.args[3],{
				stage : msg.args[0],
				flow : msg.args[1],
				module : {instance:{id:msg.args[2]}}
			});
		}
		else {
			logger.debug(msg);
		}
	});

	let str = new Duplex({
		objectMode : true,
		highWaterMark : HWM,
		async write(entry,encoding,callback) {
			cid++;
			try {
				await sem.take();
				await child.ready;
				let msg = {module:MODULE, cmd:CMD.emit, entry, cid};
				child.send(msg);
				callback();
			}catch(err) {
				callback();
			}
		},
		read() {
		}
	});

	str.instance = {id:`fork_${flowId}`};

	return str;
}

module.exports = {fork:forkFlow};
