const
	Processor = require("../"),
	logger = require("../../logger"),
	Semaphore = require('../../semaphore'),
	ModuleBolt = require('./modulebolt'),
	ShellBolt = require('./shellbolt'),
	jsexpr = require('jsexpr'),
	extend = require('extend');

const TRX = /[^a-zA-Z0-9]/g;
const DEF_CONF = {
	tuple : "${originalMessage}",
}

class MultilangProcessor extends Processor {

	constructor(id) {
		super(id);
		this.tid = 0;
		this.prmap = {};
		this.buffer = [];
	}

	get duplex() {
		return true;
	}

	async configure(cfg, callback) {
		this.cfg = extend(true,{},DEF_CONF,cfg);
		this.tupleget = jsexpr.fn(this.cfg.tuple);
		this.worker = {
			path : this.cfg.path,
			module : this.cfg.module || false,
			taskId : this.cfg.path.replace(TRX,"_"),
			config : extend(true,{},this.cfg.options)
		}
		callback();
	}

	getHandshake() {
		let worker = this.worker;
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
		let worker = this.worker;
		if (worker.module) this.proc = new ModuleBolt(worker);
		else this.proc = new ShellBolt(worker);

		try {
			this.proc.start();
			this.proc.send(this.getHandshake());
			await this.proc.ready;
		}catch(err) {
			return callback(err);
		}

		this.proc.on('log',msg=>{
			logger.debug('Log',msg);
		});

		this.proc.on('emit',msg=>{
			msg.anchors = msg.anchors || [];
			let entry = extend(
				{id:this.id},
				this.prmap[msg.anchors[0]].entry||{},
				{tuple:msg.tuple}
			);
			this.buffer.push(entry);
			this.proc.send([process.pid]);
		});

		this.proc.on('ack',msg=>{
			this.prmap[msg.id].ok();
			delete this.prmap[msg.id];
		});

		this.proc.on('fail',msg=>{
			this.prmap[msg.id].rej(msg);
			delete this.prmap[msg.id];
		});

		this.proc.on("pid", msg => {
			logger.info(`Started ${worker.taskId} (PID: ${msg.pid} )`);
		});

		this.proc.on("error", (err,msg) => {
			logger.error(err);
			if(msg.id && this.prmap[msg.id]) {
				this.prmap[msg.id].rej(err);
				delete this.prmap[msg.id];
			}
		});

		this.proc.on("close", code => {
			logger.info(`Closed with code ${code}`);
			if(code!=0) {
				Object.
					keys(this.prmap).
					map(k=>this.prmap[k]).
					forEach(pr=>{
						pr.rej('Process has exited');
					});
				this.prmap = {};
				this.reload();
			}
		});
		callback();
	}

	stop(callback) {
		if(callback) callback();
	}

	reload() {
		setTimeout(()=>{
			this.start(err=>{
				if(err) {
					logger.error(`Error reloading component`,err);
					this.reload();
				}
				else {
					logger.info(`Component reloaded`);
				}
			});
		},5000);
	}

	async process(entry,callback) {
		let tuple = this.tupleget(entry);
		let id = ++this.tid;
		let pr = new Promise((ok,rej)=>this.prmap[id] = {ok,rej,entry});

		if(!Array.isArray(tuple)) tuple = [tuple];
		this.proc.process(id,tuple);

		try {
			await pr;
			callback();
		}catch(err) {
			callback(err);
		}
	}

	async next(callback) {
		var read = false;
		while(!read) {
			if(!this.buffer.length)
				await new Promise(ok=>setTimeout(ok,100));
			else {
				read = true;
				let entry = this.buffer.shift();
				callback(null,entry);
			}
		}
	}
}

module.exports = MultilangProcessor;
