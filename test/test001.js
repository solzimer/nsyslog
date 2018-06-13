const {Writable, Readable} = require('stream');

var r = 0, w = 0;

const input = new Readable({
	objectMode : true,
	highWaterMark : 10000,
	read(size) {
		r++;
		console.log(`Called Read ${r}`);
		setImmediate(()=>{
			this.push({seq:`sequence ${r}`});
		});
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

input.pipe(output);

setTimeout(()=>{
	process.exit(0);
},100000);
