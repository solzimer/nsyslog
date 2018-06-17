const {Writable, Readable, Transform} = require('stream');

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

const transform = new Transform({
	objectMode : true,
	highWaterMark : 1000,
	transform(chunk, encoding, callback) {
		t++;
		console.log(`Called Transform ${t}`);
		setTimeout(()=>{
			callback(null,chunk);
		},1000);
	}
});

const output = new Writable({
	objectMode : true,
	highWaterMark : 10000,
  write(chunk, encoding, callback) {
		setTimeout(()=>{
			console.log("New chunk => ",chunk);
			callback();
		},1000);
  }
});

input.pipe(transform).pipe(output);

setTimeout(()=>{
	process.exit(0);
},100000);
