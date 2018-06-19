const
	Input = require('./'),
	Readable = require('stream').Readable;
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
	return new Promise(ok=>setTimeout(ok,time));
}

class InputWrapper extends Input {
	constructor(input) {
		super();
		this.input = input;
		this.stream = null;
	}

	start(queueStream,callback) {
		let input = this.input;

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
								return this.push(obj);
							}
						}catch(err) {
							this.emit('stream_error',err);
							await timer(5000);
						}
					}
				}
			});

			this.stream = stream;
			input.start((err)=>{
				stream.pipe(queueStream);
			});
		}
		else {
			input.start((err,obj)=>{
				if(err) {
					this.emit('stream_error',err);
				}
				else {
					queueStream.write(obj);
				}
			});
			callback();
		}
	}

	pause(callback) {
		if(this.stream) this.stream.pause();
		this.input.pause(callback);
	}

}

module.exports = InputWrapper;
