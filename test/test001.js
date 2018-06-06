const {Writable, Readable} = require('stream');

const input = new Readable({
	objectMode : true,
	read(size) {
		setTimeout(()=>{
			this.push({seq:"sequence"});
		},1);
	}
});

const output = new Writable({
	objectMode : true,
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
