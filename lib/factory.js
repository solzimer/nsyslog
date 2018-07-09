const
	logger = require('./logger'),
	Semaphore = require('./semaphore'),
	Queue = require('./queue'),
	PQueue = require('promise-stream-queue'),
	{Transform,Readable,Duplex} = require('stream');

function ignoreError() {}

function writer(instance,flow) {
	var tr = new Transform({
		objectMode : true,
		highWaterMark : instance.maxPending,
		transform(entry,encoding,callback) {
			try {
				instance.transport(entry,(err,res)=>{
					if(err) {
						this.emit("stream_error",err,instance,flow);
						callback(null,entry);
					}
					else {
						this.emit("stream_data",res||entry,instance,flow);
						callback(null,res);
					}
				});
			}catch(err) {
				this.emit("stream_error",err,instance,flow);
				callback(null,entry);
			}
		}
	});

	tr.flow = flow;
	tr.instance = instance;
	return tr;
}

function transform(instance,flow) {
	let queue = new PQueue();
	let sem = new Semaphore(instance.maxPending);
	let entries = [];
	let buffer = new Queue();
	let prfn = function(ok,rej) {
		let entry = entries.shift();
		instance.process(entry,(err,res)=>{
			sem.leave();
			if(err) rej(err);
			else ok(res);
		});
	}

	let tr = new Duplex({
		objectMode : true,
		highWaterMark : instance.maxPending,
		async write(entry,encoding,callback) {
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
			tr.emit("stream_error",err,instance,flow);
		}
		else if(res) {
			tr.emit("stream_data",res,instance,flow);
			buffer.push(res);
		}
	});

	tr.flow = flow;
	tr.instance = instance;
	return tr;
}

module.exports = {
	transform,writer
}
