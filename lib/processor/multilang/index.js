const
	Processor = require("../"),
	logger = require("../../logger"),
	Semaphore = require('../../semaphore'),
	Queue = require('../../queue'),
	ModuleBolt = require('./modulebolt'),
	ShellBolt = require('./shellbolt'),
	jsexpr = require('jsexpr'),
	extend = require('extend');

const TRX = /[^a-zA-Z0-9]/g;
const WIRE = {
	shuffle : "shuffle",
	group : "group"
}

const DEF_CONF = {
	cores : 1,
	tuple : "${originalMessage}",
	wire : "shuffle",
	field : "_${seq}_"
}

const LOG_LEVEL = {
	0: "trace",
	1: "debug",
	2: "info",
	3: "warn",
	4: "error"
}

function hash(str) {
	str += "";
	var res = 0, len = str.length;
	for (var i = 0; i < len; i++) {
		res = res * 31 + str.charCodeAt(i);
		res = res & res;
	}
	return Math.abs(res);
}

class MultilangProcessor extends Processor {

	constructor(id) {
		super(id);
		this.tid = 0;
		this.prmap = {};
		this.workers = [];
		this.procs = [];
	}

	async configure(cfg, callback) {
		this.cfg = extend(true,{},DEF_CONF,cfg);
		this.tupleget = jsexpr.fn(this.cfg.input||'${originalMessage}');
		this.tupleput = jsexpr.assign(this.cfg.output||"out");
		this.wire = WIRE[this.cfg.wire] || WIRE.shuffle;
		this.field = jsexpr.expr(this.cfg.field||"${input}");

		for(let i=0;i<this.cfg.cores;i++) {
			this.workers.push({
					idx : i,
					path : this.cfg.path,
					module : this.cfg.module || false,
					taskId : this.cfg.path.replace(TRX,"_"),
					config : extend(true,{},this.cfg.options)
			});
		}
		callback();
	}

	getHandshake(worker) {
		let conf = extend({},{"WORKER.id":worker.taskId},worker.config);

		return {
			"conf": conf,
			"pidDir": `/tmp`,
			"context": {
				"taskId": worker.taskId
			}
		};
	}

	async start(callback) {
		this.active = true;
		let workers = this.workers;

		this.procs = this.workers.map(worker=>{
			return worker.module? new ModuleBolt(worker) : new ShellBolt(worker);
		});

		try {
			let all = this.procs.map(proc=>{
				proc.start();
				proc.send(this.getHandshake(proc.worker));
				return proc.ready;
			});
			await Promise.all(all);
		}catch(err) {
			return callback(err);
		}

		this.procs.forEach(this.handle.bind(this));
		callback();
	}

	handle(proc) {
		proc.on('log',msg=>{
			let level = LOG_LEVEL[msg.level] || "info";
			logger[level](proc.worker.taskId,msg);
		});

		proc.on('emit',msg=>{
			msg.anchors = msg.anchors || [];
			let anchor = msg.anchors[0];
			let entry = extend(
				{id:this.id},
				this.prmap[msg.anchors[0]].entry||{},
			);
			this.tupleput(entry,msg.tuple);
			if(anchor)
				this.prmap[anchor].emit.push(entry);

			proc.send([process.pid]);
		});

		proc.on('ack',msg=>{
			let pr = this.prmap[msg.id];
			delete this.prmap[msg.id];
			pr.callback(null,pr.emit);
		});

		proc.on('fail',msg=>{
			let pr = this.prmap[msg.id];
			delete this.prmap[msg.id];
			pr.callback(msg);
		});

		proc.on("pid", msg => {
			logger.info(`Started ${proc.worker.taskId} (PID: ${msg.pid} )`);
		});

		proc.on("error", (err,msg) => {
			logger.error(err);
			let pr = this.prmap[msg.id];
			if(pr) {
				delete this.prmap[msg.id];
				pr.callback(msg)
			}
		});

		proc.on("close", code => {
			logger.info(`Closed with code ${code}`);
			proc.stop(true);

			if(code!=0) {
				Object.
					keys(this.prmap).
					map(k=>this.prmap[k]).
					filter(pr=>proc.worker.idx==pr.idx).
					forEach(pr=>{
						delete this.prmap[pr.id];
						pr.callback(`Process has died with code ${code}`);
					});

				setTimeout(()=>{
					if(!this.active) return;
					logger.info(`Restarting process ${proc.worker.taskId}`);
					proc.start();
					proc.send(this.getHandshake(proc.worker));
				},1000);
			}
		});
	}

	stop(callback) {
		this.active = false;

		this.procs.forEach(proc=>{
			proc.removeAllListeners();
			proc.stop();
		});

		Object.keys(this.prmap).forEach(k=>{
			let pr = this.prmap[k];
			pr.callback();
		});

		this.prmap = {};
		this.procs = [];

		if(callback) callback();
	}

	async process(entry,callback) {
		if(!this.active) return;

		let tuple = this.tupleget(entry);
		let id = ++this.tid;

		if(!Array.isArray(tuple)) tuple = [tuple];
		let idx = 0;
		switch(this.wire) {
			case WIRE.group :
				idx = hash(this.field(entry))%this.procs.length;
				break;
			case WIRE.shuffle :
			default :
				idx = Math.floor(Math.random()*this.procs.length);
				break;
		}

		let pr = {id,callback,entry,idx,emit:[]};
		let proc = this.procs[idx];
		try {
			await proc.ready;
			this.prmap[id] = pr;
			proc.process(id,tuple);
		}catch(err) {
			callback(err);
		}
	}
}

module.exports = MultilangProcessor;
