const
	Input = require('./'),
	logger = require('../logger'),
	Readable = require('stream').Readable;
	Transform = require('stream').Transform;
	MODE = Input.MODE;

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
		super();
		this.input = input;
		this.instance = input;
		this.stream = null;
		this.queueStream = null;
	}

	start(queueStream,callback) {
		let input = this.input;
		let filter = input.when.filter? jsexpr.eval(input.when.filter) : false;
		let bypass = input.when.bypass;

		if(input.mode==MODE.pull) {
			let stream = new Readable({
				objectMode:true,
				highWaterMark:this.input.maxPending,
				async read(n) {
					while(true) {
						try {
							let obj = await next(input);
							if(!obj)
								await timer(100);
							else {
								obj.input = input.id;
								obj.type = input.type;
								if(filter && !filter(obj)) {
									if(bypass) return this.push(obj);
								}
								else {
									return this.push(obj);
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

					if(filter && !filter(obj)) {
						if(bypass) {
							this.emit('stream_data',obj);
							queueStream.write(obj);
						}
					}
					else {
						this.emit('stream_data',obj);
						queueStream.write(obj);
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
