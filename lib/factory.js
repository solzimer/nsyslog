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
						this.emit("stream_data",res,instance,flow);
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
	if(!instance.duplex) {
		let queue = new PQueue();
		let sem = new Semaphore(instance.maxPending);
		let buffer = new Queue();
		let tr = new Duplex({
			objectMode : true,
			highWaterMark : instance.maxPending,
			async write(entry,encoding,callback) {
				await sem.take();
				queue.push(new Promise((ok,rej)=>{
					instance.process(entry,(err,res)=>{
						sem.leave();
						if(err) rej(err);
						else ok(res);
					});
				}));
				callback();
			},
			read() {
				buffer.pop((err,entry)=>{
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
	else {
		let queue = new PQueue();
		let sem = new Semaphore(instance.maxPending);
		let tr = new Duplex({
			objectMode : true,
			highWaterMark : instance.maxPending,
			async write(entry,encoding,callback) {
				await sem.take();
				queue.push(new Promise((ok,rej)=>{
					instance.process(entry,(err,res)=>{
						sem.leave();
						if(err) rej(err);
						else ok();
					});
				}));
				setImmediate(()=>callback());
			},
			read(size) {
				instance.next((err,res)=>{
					if(err) {
						this.emit("stream_error",err,instance,flow);
					}
					else if(res) {
						this.emit("stream_data",res,instance,flow);
						this.push(res);
					}
				});
			}
		});

		queue.forEach((err,res)=>{
			if(err)	tr.emit("stream_error",err,instance,flow);
		});

		tr.flow = flow;
		tr.instance = instance;
		return tr;
	}
}

module.exports = {
	transform,writer
}
