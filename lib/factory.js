const
	logger = require('./logger'),
	Semaphore = require('./semaphore'),
	Component = require('./component'),
	Events = Component.Events,
	Queue = require('./queue'),
	PQueue = require('promise-stream-queue'),
	jsexpr = require('jsexpr'),
	{Duplex} = require('stream');

const FILTER_ACTION = {
	process : 'process',
	bypass : 'bypass',
	block : 'block'
}

function writer(instance,flow) {
	let def = instance.$def;
	let queue = new PQueue();
	let mutex = new Semaphore(def.maxPending);
	let entries = [];
	let buffer = new Queue();
	let filter = def.when.filter? jsexpr.eval(def.when.filter) : false;
	let filterMatch = FILTER_ACTION[def.when.match] || FILTER_ACTION.process;
	let filterNoMatch = FILTER_ACTION[def.when.nomatch] || FILTER_ACTION.block;

	let prfn = function(ok,rej) {
		let entry = entries.shift();

		if(filter && filter(entry)) {
			if(filterMatch==FILTER_ACTION.bypass) {
				ok(entry);
				return tr.emit(Events.ack,entry,{instance,flow});
			}
			else if(filterMatch==FILTER_ACTION.block) {
				ok(null);
				return tr.emit(Events.ack,entry,{instance,flow});
			}
		}
		else if(filter && !filter(entry)) {
			if(filterNoMatch==FILTER_ACTION.bypass) {
				ok(entry);
				return tr.emit(Events.ack,entry,{instance,flow});
			}
			else if(filterNoMatch==FILTER_ACTION.block) {
				ok(null);
				return tr.emit(Events.ack,entry,{instance,flow});
			}
		}

		try {
			instance.transport(entry,(err,res)=>{
				if(err) rej(err);
				else {
					//logger.silly(`Transporter ${instance.id} emitted entry`,entry);
					tr.emit(Events.ack,entry,{instance,flow});
					ok(res||entry);
				}
			});
		}catch(err) {
			rej(err);
		}
	}

	let tr = new Duplex({
		objectMode : true,
		highWaterMark : instance.maxPending || instance.$def.maxPending,
		async write(entry,encoding,callback) {
			//logger.silly(`Sending to transport ${instance.id}`,entry);
			entries.push(entry);
			queue.push(new Promise(prfn));
			await mutex.take();
			callback();
		},
		read() {
			buffer.pop(tr._buffpop);
		}
	});

	queue.forEach((err,res,ex,next)=>{
		if(err) {
			tr.emit(Events.error,err,{instance,flow});
			mutex.leave();
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
		else if(!res) {
			mutex.leave();
		}
	});

	tr.flow = flow;
	tr.instance = instance;
	tr._buffpop = function(err,entry){
		mutex.leave();
		if(Array.isArray(entry))
			entry.forEach(item=>tr.push(item));
		else if(entry)
			tr.push(entry);
	}

	Component.handlePipe(tr);
	return tr;
}

function transform(instance,flow) {
	let def = instance.$def;
	let queue = new PQueue();
	let mutex = new Semaphore(def.maxPending);
	let entries = [];
	let buffer = new Queue();
	let filter = def.when.filter? jsexpr.eval(def.when.filter) : false;
	let filterMatch = FILTER_ACTION[def.when.match] || FILTER_ACTION.process;
	let filterNoMatch = FILTER_ACTION[def.when.nomatch] || FILTER_ACTION.block;

	let prfn = async function(ok,rej) {
		let entry = entries.shift();

		if(filter && filter(entry)) {
			if(filterMatch==FILTER_ACTION.bypass) {
				ok(entry);
				return tr.emit(Events.ack,entry,{instance,flow});
			}
			else if(filterMatch==FILTER_ACTION.block) {
				ok(null);
				return tr.emit(Events.ack,entry,{instance,flow});
			}
		}
		else if(filter && !filter(entry)) {
			if(filterNoMatch==FILTER_ACTION.bypass) {
				ok(entry);
				return tr.emit(Events.ack,entry,{instance,flow});
			}
			else if(filterNoMatch==FILTER_ACTION.block) {
				ok(null);
				return tr.emit(Events.ack,entry,{instance,flow});
			}
		}

		try {
			await instance.process(entry,(err,res)=>{
				if(err) rej(err);
				else {
					//logger.silly(`Processor ${instance.id} emitted entry`,res);
					tr.emit(Events.ack,entry,{instance,flow});
					ok(res);
				}
			});
		}catch(err) {
			rej(err);
		}
	}

	let tr = new Duplex({
		objectMode : true,
		highWaterMark : instance.maxPending || instance.$def.maxPending,
		async write(entry,encoding,callback) {
			//logger.silly(`Sending to processor ${instance.id}`,entry);
			entries.push(entry);
			queue.push(new Promise(prfn));
			await mutex.take();
			callback();
		},
		read() {
			buffer.pop(this._buffpop);
		}
	});

	// Async pushed entries
	instance.push = async function(entry,callback) {
		await mutex.take();
		queue.push(Promise.resolve(entry));
	}

	queue.forEach((err,res,ex,next)=>{
		if(err) {
			tr.emit(Events.error,err,{instance,flow});
			mutex.leave();	// Release mutex
		}
		else if(Array.isArray(res)) {
			if(res.length) {
				res.forEach(r=>{
					tr.emit(Events.data,r,{instance,flow});
				});
				buffer.push(res);
			}
		}
		else if(res) {
			tr.emit(Events.data,res,{instance,flow});
			buffer.push(res);
		}
		else if(!res) {
			mutex.leave();	// Release mutex
		}
	});

	tr.flow = flow;
	tr.instance = instance;
	tr._buffpop = function(err,entry) {
		mutex.leave();	// Release mutex
		if(Array.isArray(entry))
			entry.forEach(item=>tr.push(item));
		else if(entry)
			tr.push(entry);
		else {
			logger.error(`Null entry on processor ${instance.id}!`);
			throw new Error(`Null entry on processor ${instance.id}!`);
		}
	}

	Component.handlePipe(tr);
	return tr;
}

module.exports = {
	transform,writer
}
