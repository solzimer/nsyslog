const
	Processor = require("../"),
	logger = require("../../logger"),
	Semaphore = require('../../semaphore'),
	ModuleBolt = require('./modulebolt'),
	ShellBolt = require('./shellbolt'),
	extend = require('extend');

const TRX = /[^a-zA-Z0-9]/g;

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
		this.worker = {
			path : cfg.path,
			module : cfg.module || false,
			taskId : cfg.path.replace(TRX,"_"),
			config : extend(true,{},cfg.options)
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
			logger.info('Log',msg);
		});

		this.proc.on('emit',msg=>{
			msg.anchors = msg.anchors || [];
			let entry = extend(
				{id:this.id},
				this.prmap[msg.anchors[0]]||{},
				{tuple:msg.tuple}
			);

			this.buffer.push(entry);
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

		callback();
	}

	stop(callback) {
		if(callback) callback();
	}

	async process(entry,callback) {
		let tuple = [entry.originalMessage];
		let id = ++this.tid;
		let pr = new Promise((ok,rej)=>this.prmap[id] = {ok,rej,entry});
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
