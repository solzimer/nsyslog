const
	logger = require('./logger'),
	Semaphore = require('./semaphore'),
	Component = require('./component'),
	Events = Component.Events,
	Queue = require('./queue'),
	PQueue = require('promise-stream-queue'),
	jsexpr = require('jsexpr'),
	{Transform,Readable,Duplex} = require('stream');

function ignoreError() {}

function writer(instance,flow) {
	let def = instance.$def;
	let queue = new PQueue();
	let sem = new Semaphore(def.maxPending);
	let entries = [];
	let buffer = new Queue();
	let filter = def.when.filter? jsexpr.eval(def.when.filter) : false;
	let bypass = def.when.bypass;

	let prfn = function(ok,rej) {
		let entry = entries.shift();

		if(!filter && bypass) {
			sem.leave();
			ok(entry);
			tr.emit(Events.ack,entry,instance,flow);
		}
		else if(filter && !filter(entry)) {
			sem.leave();
			ok(bypass? entry : null);
			tr.emit(Events.ack,entry,{instance,flow});
		}
		else {
			try {
				instance.transport(entry,(err,res)=>{
					sem.leave();
					if(err) rej(err);
					else {
						logger.silly(`Transporter ${instance.id} emitted entry`,entry);
						tr.emit(Events.ack,entry,{instance,flow});
						ok(res||entry);
					}
				});
			}catch(err) {
				sem.leave();
				rej(err);
			}
		}
	}

	let tr = new Duplex({
		objectMode : true,
		highWaterMark : instance.maxPending,
		async write(entry,encoding,callback) {
			logger.silly(`Sending to transport ${instance.id}`,entry);
			await sem.take();
			entries.push(entry);
			queue.push(new Promise(prfn));
			callback();
		},
		read() {
			buffer.pop((err,entry)=>{
				if(Array.isArray(entry))
					entry.forEach(item=>this.push(item));
				else if(entry)
					this.push(entry);
			});
		}
	});

	queue.forEach((err,res,ex,next)=>{
		if(err) {
			tr.emit(Events.error,err,{instance,flow});
		}
		else if(Array.isArray(res)) {
			if(res.length) {
				res.forEach(r=>{
					tr.emit(Events.data,r,{instance,flow});
					buffer.push(r);
				});
			}
		}
		else if(res) {
			tr.emit(Events.data,res,{instance,flow});
			buffer.push(res);
		}
	});

	tr.flow = flow;
	tr.instance = instance;
	Component.handlePipe(tr);
	return tr;
}

function transform(instance,flow) {
	let def = instance.$def;
	let queue = new PQueue();
	let sem = new Semaphore(def.maxPending);
	let entries = [];
	let buffer = new Queue();
	let filter = def.when.filter? jsexpr.eval(def.when.filter) : false;
	let bypass = def.when.bypass;

	let prfn = async function(ok,rej) {
		let entry = entries.shift();

		if(!filter && bypass) {
			sem.leave();
			ok(entry);
			tr.emit(Events.ack,entry,{instance,flow});
		}
		else if(filter && !filter(entry)) {
			sem.leave();
			ok(bypass? entry : null);
			tr.emit(Events.ack,entry,{instance,flow});
		}
		else {
			try {
				await instance.process(entry,(err,res)=>{
					sem.leave();
					if(err) rej(err);
					else {
						logger.silly(`Processor ${instance.id} emitted entry`,res);
						tr.emit(Events.ack,entry,{instance,flow});
						ok(res);
					}
				});
			}catch(err) {
				sem.leave();
				rej(err);
			}
		}
	}

	let tr = new Duplex({
		objectMode : true,
		highWaterMark : instance.maxPending,
		async write(entry,encoding,callback) {
			logger.silly(`Sending to processor ${instance.id}`,entry);
			await sem.take();
			entries.push(entry);
			queue.push(new Promise(prfn));
			callback();
		},
		read() {
			buffer.pop((err,entry)=>{
				if(Array.isArray(entry))
					entry.forEach(item=>this.push(item));
				else if(entry)
					this.push(entry);
				else {
					logger.error(`Null entry on processor ${instance.id}!`);
					throw new Error(`Null entry on processor ${instance.id}!`);
				}
			});
		}
	});

	// Async pushed entries
	instance.push = async function(entry,callback) {
		await sem.take();
		queue.push(Promise.resolve(entry));
		sem.leave();
		if(callback) callback();
	}

	queue.forEach((err,res,ex,next)=>{
		if(err) {
			tr.emit(Events.error,err,{instance,flow});
		}
		else if(Array.isArray(res)) {
			if(res.length) {
				res.forEach(r=>{
					tr.emit(Events.data,r,{instance,flow});
					buffer.push(r);
				});
			}
		}
		else if(res) {
			tr.emit(Events.data,res,{instance,flow});
			buffer.push(res);
		}
	});

	tr.flow = flow;
	tr.instance = instance;
	Component.handlePipe(tr);
	return tr;
}

module.exports = {
	transform,writer
}
