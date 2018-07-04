const
	{Writable, Readable, Transform, Duplex} = require('stream'),
	PQueue = require('promise-stream-queue'),
	Semaphore = require('../lib/semaphore');

var r = 0, w = 0, t = 0;

const input = new Readable({
	objectMode : true,
	highWaterMark : 1,
	read(size) {
		r++;
		console.log(`Called Read ${r}`);
		setImmediate(()=>{
			this.push({seq:`sequence ${r}`});
		});
	}
});

const sem = new Semaphore(1000);
const queue = new PQueue();
const transform = new Transform({
	objectMode : true,
	async write(chunk, encoding, callback) {
		t++;
		console.log(`Called Transform ${t}`);

		await sem.take();
		queue.push(new Promise((ok,rej)=>{
			setTimeout(()=>{
				ok();
				sem.leave();
			},5000);
		}));
		callback();
	},

	async read() {
		queue.forEach((err,res,ex)=>{
			if(!err)
				this.push(res);
		});
	}
});

const output = new Writable({
	objectMode : true,
	highWaterMark : 10000,
  write(chunk, encoding, callback) {
		w++;
		console.log(`Called Write ${w}`);
		setTimeout(()=>{
			console.log("New chunk => ",chunk);
			callback();
		},1000);
		return true;
  }
});

input.pipe(transform).pipe(output);

setTimeout(()=>{
	process.exit(0);
},100000);
