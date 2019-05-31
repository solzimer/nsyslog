const
	logger = require('./logger'),
	Semaphore = require('./semaphore'),
	Component = require('./component'),
	Events = Component.Events,
	Queue = require('./queue'),
	PQueue = require('promise-stream-queue'),
	Stats = require('./stats'),
	jsexpr = require('jsexpr'),
	mingo = require('mingo'),
	{Duplex} = require('stream');

const stats = Stats.fetch('main');
const FILTER_ACTION = {
	process : 'process',
	bypass : 'bypass',
	block : 'block'
}

function getFilter(def) {
	let filter = def.when.filter;

	if(filter) {
		if(typeof(filter)=='object') {
			let query = new mingo.Query(filter);
			return (entry)=>query.test(entry);
		}
		else if(typeof(filter)=='string') {
			return jsexpr.eval(filter);
		}
		else {
			return ()=>filter;
		}
	}
	else {
		return false;
	}
}

function writer(instance,flow) {
	let def = instance.$def;
	let queue = new PQueue();
	let mutex = new Semaphore(def.maxPending);
	let entries = [];
	let buffer = new Queue();
	let filter = getFilter(def);
	let filterMatch = FILTER_ACTION[def.when.match] || FILTER_ACTION.process;
	let filterNoMatch = FILTER_ACTION[def.when.nomatch] || FILTER_ACTION.block;

	let prfn = function(ok,rej) {
		let entry = entries.shift();

		if(filter && filter(entry)) {
			if(filterMatch==FILTER_ACTION.bypass) {
				ok(entry);
				return stats.ack('transporter',instance.id);
			}
			else if(filterMatch==FILTER_ACTION.block) {
				ok(null);
				return stats.ack('transporter',instance.id);
			}
		}
		else if(filter && !filter(entry)) {
			if(filterNoMatch==FILTER_ACTION.bypass) {
				ok(entry);
				return stats.ack('transporter',instance.id);
			}
			else if(filterNoMatch==FILTER_ACTION.block) {
				ok(null);
				return stats.ack('transporter',instance.id);
			}
		}

		try {
			instance.transport(entry,(err,res)=>{
				if(err) rej(err);
				else {
					//logger.silly(`Transporter ${instance.id} emitted entry`,entry);
					stats.ack('transporter',instance.id);
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
			stats.fail('transporter',instance.id);
			mutex.leave();
		}
		else if(Array.isArray(res)) {
			if(res.length) {
				res.forEach(r=>{
					stats.emit('transporter',instance.id);
					buffer.push(r);
				});
			}
		}
		else if(res) {
			stats.emit('transporter',instance.id);
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
	let filter = getFilter(def);
	let filterMatch = FILTER_ACTION[def.when.match] || FILTER_ACTION.process;
	let filterNoMatch = FILTER_ACTION[def.when.nomatch] || FILTER_ACTION.block;

	let prfn = async function(ok,rej) {
		let entry = entries.shift();

		if(filter && filter(entry)) {
			if(filterMatch==FILTER_ACTION.bypass) {
				ok(entry);
				return stats.ack('processor',instance.id);
			}
			else if(filterMatch==FILTER_ACTION.block) {
				ok(null);
				return stats.ack('processor',instance.id);
			}
		}
		else if(filter && !filter(entry)) {
			if(filterNoMatch==FILTER_ACTION.bypass) {
				ok(entry);
				return stats.ack('processor',instance.id);
			}
			else if(filterNoMatch==FILTER_ACTION.block) {
				ok(null);
				return stats.ack('processor',instance.id);
			}
		}

		try {
			await instance.process(entry,(err,res)=>{
				if(err) rej(err);
				else {
					//logger.silly(`Processor ${instance.id} emitted entry`,res);
					stats.ack('processor',instance.id);
					ok(res);
				}
			});
		}catch(err) {
			logger.error(err);
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
			stats.fail('processor',instance.id);
			mutex.leave();	// Release mutex
		}
		else if(Array.isArray(res)) {
			if(res.length) {
				res.forEach(r=>{
					stats.emit('processor',instance.id);
				});
				buffer.push(res);
			}
		}
		else if(res) {
			stats.emit('processor',instance.id);
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
