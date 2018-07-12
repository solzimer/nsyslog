const
	cluster = require('./'),
	worker = require('./flow-worker'),
	logger = require('../logger'),
	PQueue = require('promise-stream-queue'),
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
	let pmap = {};
	let pqueue = new PQueue();
	let buffer = new Queue();
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
			pmap[cid].ok();
			delete pmap[cid];
		}
		else if(msg.cmd == CMD.error && hasCid) {
			pmap[cid].rej(err.error);
			delete pmap[cid];
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
			entry = {a:""};
			cid++;
			try {
				await child.ready;
				await new Promise((ok,rej)=>{
					let pr = {ok, rej, cid, entry};
					let msg = {module:MODULE, cmd:CMD.emit, entry, cid};
					pqueue.push(pr);
					pmap[cid] = pr;
					child.send(msg);
				});
				callback();
			}catch(err) {
				callback(err);
			}
		},
		read() {
			buffer.pop((err,entry)=>{
				this.push(entry);
			});
		}
	});

	return str;
}

module.exports = {fork:forkFlow};
