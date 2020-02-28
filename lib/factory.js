const
	logger = require('./logger'),
	Semaphore = require('./semaphore'),
	Component = require('./component'),
	Queue = require('./queue'),
	PQueue = require('promise-stream-queue'),
	Stats = require('./stats'),
	jsexpr = require('jsexpr'),
	mingo = require('mingo'),
	{PROC_MODE,FILTER_ACTION} = require('./constants'),
	{Duplex} = require('stream');

const stats = Stats.fetch('main');

/**
 * Duplex stream with extended methods
 * @class
 * @abstract
 * @extends Duplex
 * @memberof Factory
 */
class ExtendedDuplex extends Duplex {
	constructor(duplex,flow,instance) {
		super();

		/** @property {Object} flow Flow this stream is attached to */
		this.flow = null;
		/** @property {Component} instance Component instance {@link Processor} or {@link Transporter} */
		this.instance = null;
	}

	/**
	 * Subscribe to component events. It differs from the "on" EventEmitter method as it is
	 * mean to be more simple and performant.
	 * @param {Constants.PROC_MODE} mode Event name
	 * @param {Function} calllback Callback function (listener)
	 */
	subscribe(mode,callback){}

	/**
	 * Unsubscribe to component events previously subscribed with the
	 * subscribe method
	 * @param {Constants.PROC_MODE} mode Event name
	 * @param {Function} calllback Callback function (listener)
	 */
	unsubscribe(mode,callback) {}
}

function getFilter(phase) {
	let filter = phase.filter;

	if(filter) {
		if(typeof(filter)=='object') {
			let query = new mingo.Query(filter);
			return (entry)=>query.test(entry);
		}
		else if(typeof(filter)=='string') {
			try {
				return jsexpr.eval(filter);
			}catch(err) {
				logger.error(`Invalid expression '${filter}' will be ignored.`,err);
				return false;
			}
		}
		else {
			return ()=>filter;
		}
	}
	else {
		return false;
	}
}

/**
 * Creates a {@link Duplex} Writable stream from a {@link Transporter} component,
 * ready to be attached to a flow stream
 *
 * @memberof Factory
 * @param  {Transporter} instance Transporter instance
 * @param  {Object} flow Flow instance
 * @return {ExtendedDuplex} Duplex stream
 */
function writer(instance,flow) {
	let def = instance.$def || {};
	let queue = new PQueue();
	let mutex = new Semaphore(def.maxPending);
	let entries = [];
	let buffer = new Queue();
	let filter = def.disabled? null : getFilter(def.when);
	let filterMatch = FILTER_ACTION[def.when.match] || FILTER_ACTION.process;
	let filterNoMatch = FILTER_ACTION[def.when.nomatch] || FILTER_ACTION.block;
	let listeners = {in:new Set(),ack:new Set(),out:new Set()};

	function notify(mode,entry) {
		listeners[mode].forEach(l=>l('transporters',instance.id,mode,entry));
	}

	let prfn = function(ok,rej) {
		let entry = entries.shift();

		if(filter && filter(entry)) {
			if(filterMatch==FILTER_ACTION.bypass) {
				ok(entry);
				notify(PROC_MODE.ack,entry);
				return stats.ack('transporter',instance.id);
			}
			else if(filterMatch==FILTER_ACTION.block) {
				ok(null);
				notify(PROC_MODE.ack,entry);
				return stats.ack('transporter',instance.id);
			}
		}
		else if(filter && !filter(entry)) {
			if(filterNoMatch==FILTER_ACTION.bypass) {
				ok(entry);
				notify(PROC_MODE.ack,entry);
				return stats.ack('transporter',instance.id);
			}
			else if(filterNoMatch==FILTER_ACTION.block) {
				ok(null);
				notify(PROC_MODE.ack,entry);
				return stats.ack('transporter',instance.id);
			}
		}

		try {
			instance.transport(entry,(err,res)=>{
				if(err) {
					logger.error(err);
					rej(err);
				}
				else {
					//logger.info(`Transporter ${instance.id} emitted entry`,res.$$reemit);
					notify(PROC_MODE.ack,entry);
					stats.ack('transporter',instance.id);
					ok(res||entry);
				}
			});
		}catch(err) {
			logger.error(err);
			rej(err);
		}
	};

	let tr = new Duplex({
		objectMode : true,
		highWaterMark : instance.maxPending || instance.$def.maxPending,
		async write(entry,encoding,callback) {
			//logger.silly(`Sending to transport ${instance.id}`,entry);
			notify(PROC_MODE.input,entry);
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
			else {
				mutex.leave();
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

	instance.streams.push(tr);
	tr.flow = flow;
	tr.instance = instance;
	tr.subscribe = function(mode,callback) {
		listeners[mode].add(callback);
	};
	tr.unsubscribe = function(mode,callback) {
		listeners[mode].delete(callback);
	};
	tr._buffpop = function(err,entry){
		mutex.leave();
		if(Array.isArray(entry)) {
			entry.forEach(item=>notify(PROC_MODE.output,item));
			entry.forEach(item=>tr.push(item));
		}
		else if(entry) {
			notify(PROC_MODE.output,entry);
			tr.push(entry);
		}
	};

	Component.handlePipe(tr);
	return tr;
}

/**
 * Creates a {@link Duplex} Transform stream from a {@link Processor} component,
 * ready to be attached to a flow stream
 *
 * @memberof Factory
 * @param  {Processor} instance Processor instance
 * @param  {Object} flow Flow instance
 * @return {ExtendedDuplex} Duplex stream
 */
function transform(instance,flow) {
	let def = instance.$def || {};
	let queue = new PQueue();
	let mutex = new Semaphore(def.maxPending);
	let entries = [];
	let buffer = new Queue();
	let filter = def.disabled? null : getFilter(def.when);
	let filterMatch = FILTER_ACTION[def.when.match] || FILTER_ACTION.process;
	let filterNoMatch = FILTER_ACTION[def.when.nomatch] || FILTER_ACTION.block;
	let pfilter = def.disabled? null : getFilter(def.then);
	let pfilterMatch = FILTER_ACTION[def.then.match] || FILTER_ACTION.process;
	let pfilterNoMatch = FILTER_ACTION[def.then.nomatch] || FILTER_ACTION.block;
	let listeners = {in:new Set(),ack:new Set(),out:new Set()};

	function notify(mode,entry) {
		listeners[mode].forEach(l=>l('processors',instance.id,mode,entry));
	}

	function postFilter(item) {
		if(!pfilter) return item;
		else {
			if(pfilter(item)) {
				if(pfilterMatch==FILTER_ACTION.block) return null;
				else return item;
			}
			else {
				if(pfilterNoMatch==FILTER_ACTION.block) return null;
				else return item;
			}
		}
	}

	let prfn = async function(ok,rej) {
		let entry = entries.shift();

		if(filter && filter(entry)) {
			if(filterMatch==FILTER_ACTION.bypass) {
				ok(entry);
				notify(PROC_MODE.ack,entry);
				return stats.ack('processor',instance.id);
			}
			else if(filterMatch==FILTER_ACTION.block) {
				ok(null);
				notify(PROC_MODE.ack,entry);
				return stats.ack('processor',instance.id);
			}
		}
		else if(filter && !filter(entry)) {
			if(filterNoMatch==FILTER_ACTION.bypass) {
				ok(entry);
				notify(PROC_MODE.ack,entry);
				return stats.ack('processor',instance.id);
			}
			else if(filterNoMatch==FILTER_ACTION.block) {
				ok(null);
				notify(PROC_MODE.ack,entry);
				return stats.ack('processor',instance.id);
			}
		}

		try {
			await instance.process(entry,(err,res)=>{
				if(err) {
					logger.error(err);
					rej(err);
				}
				else {
					//logger.silly(`Processor ${instance.id} emitted entry`,res);
					notify(PROC_MODE.ack,entry);
					stats.ack('processor',instance.id);
					ok(res);
				}
			});
		}catch(err) {
			logger.error(err);
			rej(err);
		}
	};

	let tr = new Duplex({
		objectMode : true,
		highWaterMark : instance.maxPending || instance.$def.maxPending,
		async write(entry,encoding,callback) {
			//logger.silly(`Sending to processor ${instance.id}`,entry);
			notify(PROC_MODE.input,entry);
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
		callback();
	};

	queue.forEach((err,res,ex,next)=>{
		if(err) {
			stats.fail('processor',instance.id);
			mutex.leave();	// Release mutex
		}
		else if(Array.isArray(res)) {
			if(res.length) {
				res = res.filter(postFilter);
				if(!res.length) {
					mutex.leave();
				}
				else {
					res.forEach(()=>stats.emit('processor',instance.id));
					buffer.push(res);
				}
			}
			else {
				mutex.leave();
			}
		}
		else if(res) {
			res = [res].filter(postFilter);
			if(!res.length) {
				mutex.leave();
			}
			else {
				stats.emit('processor',instance.id);
				buffer.push(res[0]);
			}
		}
		else if(!res) {
			mutex.leave();	// Release mutex
		}
	});

	instance.streams.push(tr);
	tr.flow = flow;
	tr.instance = instance;
	tr.subscribe = function(mode,callback) {
		listeners[mode].add(callback);
	};
	tr.unsubscribe = function(mode,callback) {
		listeners[mode].delete(callback);
	};
	tr._buffpop = function(err,entry) {
		mutex.leave();	// Release mutex
		if(Array.isArray(entry)) {
			entry.forEach(item=>notify(PROC_MODE.output,item));
			entry.forEach(item=>tr.push(item));
		}
		else if(entry) {
			notify(PROC_MODE.output,entry);
			tr.push(entry);
		}
		else {
			logger.error(`Null entry on processor ${instance.id}!`);
			throw new Error(`Null entry on processor ${instance.id}!`);
		}
	};

	Component.handlePipe(tr);
	return tr;
}

/**
 * @namespace
 * @description <p>Utility package to transform {@link Processor} and {@link Transporter} into node duplex streams.</p>
 * <p>This module is used internally by NSyslog to achieve this transformation in order to pipe the flow components using
 * the node streams API</p>
 * @example
 * const {Processor,Factory} = require('nsyslog').Core;
 * class MyProc extends Processor {
 * 	process(entry, callback) {
 * 		entry.processed = true;
 * 		callback(null, entry);
 * 	}
 * }
 *
 * let myProcStream = Factory.transform(new MyProc('myproc'),{id:'myflow'});
 * ....
 */
const Factory = {
	transform,
	writer,
	ExtendedDuplex
};

module.exports = Factory;
