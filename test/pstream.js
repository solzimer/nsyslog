const Transform = require("stream").Transform;

var stream = new Transform({
	objectMode : true,
	transform(chunk, encoding, callback) {
		console.log("Chunk!");
		chunk.then(res=>callback(null,res),err=>callback(err,null));
  }
});

var i=0;
setInterval(()=>{
	stream.write(new Promise((resolve,reject)=>{
		var j = i;
		setTimeout(()=>{
			resolve(`Promise ${j}\n`);
		},Math.floor(Math.random()*1000000));
	}));
	i++;
},1);

stream.pipe(process.stdout);
