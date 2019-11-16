const
	cluster = require('./'),
	worker = require('./flow-worker'),
	logger = require('../logger'),
	Semaphore = require('../semaphore'),
	Duplex = require('stream').Duplex,
	Stats = require('../stats'),
	jsexpr = require('jsexpr'),
	hash = require('string-hash'),
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

function forkChild(cfg,flow) {
	let child = cluster.fork(SCRIPT,['--flow',flow]);
	child.ready = new Promise(async(resolve,reject)=>{
		function hdl(child,module,msg) {
			if(msg.cmd==CMD.online) {
				child.send({module,cmd:CMD.start,cfg,flow});
			}
			else if(msg.cmd==CMD.success) {
				logger.info(`Child ${child.pid} started.`);
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

	// If worker process fails, restart
	child.on('close',code=>{
		// Worker is closed by nsyslog
		if(w.closed) {
			logger.info(`Child worker ${w.child.pid} shut down`);
		}
		// Worker has crashed. Restart
		else {
			logger.warn(`Child worker ${w.child.pid} closed with code: ${code}. Restarting...`);
			w.sem.destroy();
			w.sem = new Semaphore(HWM);
			w.child = forkChild(w.cfg,w.flowId);
			handleWorker(w);
		}
	});

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

function sendEntry(entry,w) {
	return new Promise(async(ok,rej)=>{
		let msg = {module:MODULE, cmd:CMD.emit, entry, cid:w.cid++};
		try {
			await Promise.all([w.sem.take(),w.child.ready]);
		}catch(err) {
			logger.error(err);
			return rej('Child process is not ready');
		}
		w.child.send(msg,ok);
	});
}

function forkFlow(cfg,flowId,cores,mode) {
	let workers = [];
	let expr = null;
	let lidx = 0;
	cores = cores || 1;

	if(mode!==true && !MODE[mode]) {
		expr = jsexpr.expression(mode||'true');
		mode = MODE.expression;
	}
	else {
		mode = MODE[mode] || MODE.roundrobin;
	}

	let str = new Duplex({
		objectMode : true,
		highWaterMark : HWM,
		async write(entry,encoding,callback) {
			let pr = null, w = null;

			// Send entry to forked flows
			switch(mode) {
				// Mode 'all' : Send to all children
				case MODE.all :
					pr = Promise.all(workers.map(w=>sendEntry(entry,w)));
					break;

				// Mode 'expression' : Send to child based on expression eval hash
				case MODE.expression :
					let idx = hash(expr(entry)) % cores;
					w = workers[idx];
					pr = sendEntry(entry,w);
					break;

				// Mode 'balanced' : Send to less overloaded child
				case MODE.balanced :
					let min = Number.POSITIVE_INFINITY;
					let midx = -1;

					for(let i=0;i<cores;i++) {
						let nw = workers[i];
						if(nw.sem.current<min) {
							min = nw.sem.current;
							midx = i;
						}
					}

					w = workers[midx];
					pr = sendEntry(entry,w);
					break;

				// Mode 'roundrobin'
				case MODE.roundrobin :
				default :
					w = workers[lidx];
					lidx = (lidx+1)%cores;
					pr = sendEntry(entry,w);
					break;
			}

			try {
				await pr;
				callback();
			}catch(err) {
				logger.error(err);
				callback();
			}

		},
		read() {}
	});

	str.instance = {id:`fork_${flowId}`};
	str.closefork = function() {
		workers.forEach(w=>w.closed=true);
	}

	for(let i=0;i<cores;i++) {
		let w = {
			cfg, flowId, str, cid: 0,
			sem : new Semaphore(HWM),
			child : forkChild(cfg,flowId)
		}
		workers.push(w);
		handleWorker(w);
	}

	return str;
}

module.exports = {fork:forkFlow,MODULE};
