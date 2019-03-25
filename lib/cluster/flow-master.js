const
	cluster = require('./'),
	worker = require('./flow-worker'),
	logger = require('../logger'),
	Semaphore = require('../semaphore'),
	Duplex = require('stream').Duplex,
	Stats = require('../stats'),
	jsexpr = require('jsexpr'),
	{CMD,MODULE} = worker;

const
	SCRIPT = `${__dirname}/flow-worker`,
	HWM = 1000,
	MODE = {
		all:"all",
		balanced:"balanced",
		roundrobin:"roundrobin",
		expression:"expression"
	};

function pcomp(w1,w2) {
	return w2.sem.current - w1.sem.current;
}

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

function handleWorker(w) {
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
			w.str.emit(msg.event,msg.args[3],{
				stage : msg.args[0],
				flow : msg.args[1],
				module : {instance:{id:msg.args[2]}}
			});
		}
		else {
			logger.debug(msg);
		}
	});
}

function forkFlow(path,flowId,cores,mode) {
	let workers = [];
	let len = 0;
	let expr = null;

	if(mode!==true && !MODE[mode]) {
		expr = jsexpr.expression(mode);
		mode = MODE.expression;
	}
	else {
		mode = MODE[mode] || MODE.roundrobin;
	}

	cores = cores || 1;

	let str = new Duplex({
		objectMode : true,
		highWaterMark : HWM,
		async write(entry,encoding,callback) {
			let pr = null;

			// Send entry to forked flows
			switch(mode) {
				// Mode 'all' : Send to all children
				case MODE.all :
					pr = Promise.all(workers.map(async(w)=>{
						let msg = {module:MODULE, cmd:CMD.emit, entry, cid:w.cid++};
						await Promise.all([w.sem.take(),w.child.ready]);
						await new Promise(ok=>w.child.send(msg,ok));
					}));
					break;

				// Mode 'roundrobin'
				case MODE.expression :
				case MODE.balanced :
					let min = Number.POSITIVE_INFINITY;
					let midx = -1;

					for(let i=0;i<len;i++) {
						let nw = workers[i];
						if(nw.sem.current<min) {
							min = nw.sem.current;
							midx = i;
						}
					}
					let w = workers[midx];
					pr = new Promise(async(ok)=>{
						let msg = {module:MODULE, cmd:CMD.emit, entry, cid:w.cid++};
						await Promise.all([w.sem.take(),w.child.ready]);
						w.child.send(msg,ok);
					});
					break;
				case MODE.roundrobin :
				default :
					pr = new Promise(async(ok)=>{
						let w = workers.shift(); workers.push(w);
						let msg = {module:MODULE, cmd:CMD.emit, entry, cid:w.cid++};
						await Promise.all([w.sem.take(),w.child.ready]);
						w.child.send(msg,ok);
					});
					break;
			}

			try {
				await pr;
				callback();
			}catch(err) {
				callback(err);
			}

		},
		read() {}
	});

	str.instance = {id:`fork_${flowId}`};

	for(let i=0;i<cores;i++) {
		let w = {
			sem : new Semaphore(HWM),
			child : forkChild(path,flowId),
			str : str, cid : 0
		}
		len++;
		workers.push(w);
		handleWorker(w);
	}

	return str;
}

module.exports = {fork:forkFlow};
