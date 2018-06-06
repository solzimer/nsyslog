const {Writable, Readable} = require('stream');

const input = new Readable({
	objectMode : true,
	read(size) {
		setTimeout(()=>{
			if(Math.random()>=0.5) {
				console.log("It's an error");
				this.push(null);
			}
			else {
				this.push({seq:"sequence"});
			}
		},1000);
	}
});

const output = new Writable({
	objectMode : true,
  write(chunk, encoding, callback) {
		console.log("New chunk => ",chunk);
		callback();
  }
});

input.on('end',()=>{
	console.log("end")
	input.emit('readable');
});
input.on('close',()=>console.log("close"));
input.on('readable',()=>console.log("readable"));
input.on('error',(err)=>{
	console.error('New Error',err);
	input.emit('readable');
});
input.pipe(output);

setTimeout(()=>{
	process.exit(0);
},100000);
