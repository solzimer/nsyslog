const
	cluster = require('./'),
	worker = require('./flow-worker'),
	logger = require('../logger'),
	Semaphore = require('../semaphore'),
	Duplex = require('stream').Duplex,
	Stats = require('../stats'),
	{CMD,MODULE} = worker;

const
	SCRIPT = `${__dirname}/flow-worker`,
	HWM = 1000,
	MODE = {
		all:"all",
		balanced:"balanced",
		roundrobin:"roundrobin"
	};

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

function forkFlow(path,flowId,cores,mode) {
	let workers = [];

	cores = cores || 1;
	mode = MODE[mode] || MODE.balanced;

	for(let i=0;i<cores;i++) {
		workers.push({
			sem : new Semaphore(HWM),
			child : forkChild(path,flowId),
			cid : 0,
		});
	}

	workers.forEach(w=>{
		let child = w.child, sem = w.sem;
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
			else if(msg.cmd == CMD.stats) {
				Stats.fetch('main').merge(msg.stats);
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
	})

	let str = new Duplex({
		objectMode : true,
		highWaterMark : HWM,
		async write(entry,encoding,callback) {
			let w = workers.shift();
			workers.push(w);
			try {
				let msg = {module:MODULE, cmd:CMD.emit, entry, cid:w.cid++};
				await Promise.all([w.sem.take(),w.child.ready]);
				w.child.send(msg,callback);
			}catch(err) {
				callback(err);
			}
		},
		read() {}
	});

	str.instance = {id:`fork_${flowId}`};

	return str;
}

module.exports = {fork:forkFlow};
