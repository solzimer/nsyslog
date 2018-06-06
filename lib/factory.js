const
	logger = require('./logger'),
	{Transform,Readable} = require('stream');

function ignoreError() {}

function writer(instance,flow) {
	var tr = new Transform({
		objectMode : true,
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
	var tr = new Transform({
		objectMode : true,
		transform(entry,encoding,callback) {
			try {
				instance.process(entry,(err,res)=>{
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

module.exports = {
	transform,writer
}
