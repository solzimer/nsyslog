const
	logger = require('./logger'),
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
		var tr = new Transform({
			objectMode : true,
			highWaterMark : instance.maxPending,
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
	else {
		var tr = new Duplex({
			objectMode : true,
			highWaterMark : instance.maxPending,
			write(entry,encoding,callback) {
				try {
					instance.process(entry,(err,res)=>{
						if(err)
							this.emit("stream_error",err,instance,flow);
						callback(null);
					});
				}catch(err) {
					this.emit("stream_error",err,instance,flow);
					callback(null);
				}
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
		tr.flow = flow;
		tr.instance = instance;
		return tr;
	}
}

module.exports = {
	transform,writer
}
