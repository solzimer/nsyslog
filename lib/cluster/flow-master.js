const
	cluster = require('./'),
	worker = require('./flow-worker'),
	logger = require('../logger'),
	PQueue = require('promise-stream-queue'),
	Queue = require('../queue'),
	Duplex = require('stream').Duplex;
	CMD = worker.CMD;

const HWM = 1000;

function forkFlow(path,flowId) {
	let child = cluster.fork(`${__dirname}/flow-worker`,['--flow',flowId]);
	let pmap = {};
	let pqueue = new PQueue();
	let buffer = new Queue();
	let cid = 0;

	let ready = new Promise(async(ok,rej)=>{
		logger.info(`Launching forked flow ${flowId}`);
		await new Promise((ok,rej)=>{
			child.once('message',msg=>{
				if(msg.cmd==CMD.online) ok();
				else rej();
			});
		});
		logger.info(`Starting forked flow ${flowId}`);
		await new Promise((ok,rej)=>{
			child.once('message',msg=>{
				if(msg.cmd==CMD.success) ok();
				else rej();
			});
			child.send({cmd:CMD.start, path:path, flow:flowId});
		});
		logger.info(`Started forked flow ${flowId}`);
		ok();
	});

	child.on('error',logger.error.bind(logger));
	child.on('close',code=>logger.info(`Child closed with code: ${code}`));
	child.on('message',msg=>{
		if(msg.cmd == CMD.error && !msg.cid) {
			logger.error(msg.error);
		}
		else if(msg.cmd == CMD.ack && msg.cid) {
			pmap[msg.cid].ok();
			delete pmap[msg.cid];
		}
		else if(msg.cmd == CMD.error && msg.cid) {
			pmap[msg.cid].rej(err.error);
			delete pmap[msg.cid];
		}
		else {
			logger.info(msg);
		}
	});

	return new Duplex({
		objectMode : true,
		highWaterMark : HWM,
		async write(entry,encoding,callback) {
			cid++;
			try {
				await ready;
				await new Promise((ok,rej)=>{
					let pr = {ok, rej, cid, entry};
					let msg = {cmd:CMD.emit, entry, cid};
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
}

module.exports = {fork:forkFlow};
