const
	Input = require('./'),
	logger = require('../logger'),
	jsexpr = require('jsexpr'),
	mingo = require('mingo'),
	Stats = require('../stats'),
	Readable = require('stream').Readable,
	Transform = require('stream').Transform,
	{FILTER_ACTION} = require('../constants'),
	MODE = Input.MODE;

const stats = Stats.fetch('main');

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

function next(input) {
	return new Promise((ok,rej)=>{
		input.next((err,data)=>{
			if(!err) ok(data);
			else rej(err);
		});
	});
}

function timer(time) {
	if(time>0)
		return new Promise(ok=>setTimeout(ok,time));
	else
		return new Promise(ok=>setImmediate(ok));
}

class InputWrapper extends Input {
	constructor(input) {
		super(input.id,input.type);
		this.input = input;
		this.instance = input;
		this.stream = null;
		this.queueStream = null;
	}

	start(queueStream,callback) {
		let input = this.input;
		let def = input.$def;
		let filter = def.disabled? null : getFilter(def);
		let filterMatch = FILTER_ACTION[def.when.match] || FILTER_ACTION.process;
		let filterNoMatch = FILTER_ACTION[def.when.nomatch] || FILTER_ACTION.block;

		if(input.mode==MODE.pull) {
			let stream = new Readable({
				objectMode:true,
				highWaterMark:def.maxPending,
				async read() {
					while(true) {
						try {
							let obj = await next(input);
							if(!obj)
								await timer(100);
							else {
								obj.input = input.id;
								obj.type = input.type;
								obj.$key = input.key(obj);

								if(!filter) {
									return this.push(obj);
								}
								else if(filter && filter(obj)) {
									if(filterMatch!=FILTER_ACTION.block) {
										return this.push(obj);
									}
								}
								else if(filter && !filter(obj)) {
									if(filterNoMatch!=FILTER_ACTION.block) {
										return this.push(obj);
									}
								}
							}
						}catch(err) {
							stats.fail('input',input.id);
							await timer(5000);
						}
					}
				}
			});

			this.stream = stream;
			this.queueStream = queueStream;
			this.stream.instance = input;

			input.start((err)=>{
				if(err) this.emit('stream_error',err);
				stream.on('data',data=>stats.emit('input',input.id));
				stream.pipe(queueStream);
			});
		}
		else {
			this.stream = null;
			this.queueStream = queueStream;

			input.start((err,obj)=>{
				if(err) {
					stats.fail('input',input.id);
				}
				else {
					obj.input = input.id;
					obj.type = input.type;
					obj.$key = input.key(obj);

					if(!filter) {
						stats.emit('input',input.id);
						queueStream.write(obj);
					}
					else if(filter && filter(obj)) {
						if(filterMatch!=FILTER_ACTION.block) {
							stats.emit('input',input.id);
							queueStream.write(obj);
						}
					}
					else if(filter && !filter(obj)) {
						if(filterNoMatch!=FILTER_ACTION.block) {
							stats.emit('input',input.id);
							queueStream.write(obj);
						}
					}
				}
			});
			callback();
		}
	}

	pause(callback) {
		if(this.stream) {
			this.stream.unpipe();
		}
		this.input.pause(callback);
	}

	resume(callback) {
		if(this.stream) {
			this.stream.pipe(this.queueStream);
		}
		this.input.resume(callback);
	}

	stop(callback) {
		if(this.stream) {
			this.stream.unpipe();
		}
		this.input.stop(err=>{
			logger.info(`Input ${this.input.id} stopped`);
			callback(err);
		});
	}
}

module.exports = InputWrapper;
