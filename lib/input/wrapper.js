const
	Input = require('./'),
	logger = require('../logger'),
	jsexpr = require('jsexpr'),
	Readable = require('stream').Readable;
	Transform = require('stream').Transform;
	MODE = Input.MODE;

const FILTER_ACTION = {
	process : 'process',
	bypass : 'bypass',
	block : 'block'
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
		let filter = def.when.filter? jsexpr.eval(def.when.filter) : false;
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
							this.emit('stream_error',err);
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
				stream.on('data',data=>this.emit('stream_data',data));
				stream.pipe(queueStream);
			});
		}
		else {
			this.stream = null;
			this.queueStream = queueStream;

			input.start((err,obj)=>{
				if(err) {
					this.emit('stream_error',err);
				}
				else {
					obj.input = input.id;
					obj.type = input.type;
					obj.$key = input.key(obj);

					if(!filter) {
						this.emit('stream_data',obj);
						queueStream.write(obj);
					}
					else if(filter && filter(obj)) {
						if(filterMatch!=FILTER_ACTION.block) {
							this.emit('stream_data',obj);
							queueStream.write(obj);
						}
					}
					else if(filter && !filter(obj)) {
						if(filterNoMatch!=FILTER_ACTION.block) {
							this.emit('stream_data',obj);
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
