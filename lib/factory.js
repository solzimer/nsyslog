const Transform = require('stream').Transform;

function error(msg) {
	console.error("Stream Error : ",msg);
}

function reader() {

}

function writer(instance,flow) {
	var tr = new Transform({
		objectMode : true,
		transform(entry,encoding,callback) {
			try {
				instance.transport(entry,(err,res)=>{
					if(err) {
						this.emit("strerr",err,instance,flow);
						callback(null,entry);
					}
					else {
						this.emit("strok",res,instance,flow);
						callback(null,res);
					}
				});
			}catch(err) {
				this.emit("strerr",err,instance,flow);
				callback(null,entry);
			}
		}
	});
	tr.flow = flow;
	tr.instance = instance;
	tr.on("error",error);
	return tr;
}

function transform(instance,flow) {
	var tr = new Transform({
		objectMode : true,
		transform(entry,encoding,callback) {
			try {
				instance.process(entry,(err,res)=>{
					if(err) {
						this.emit("strerr",err,instance,flow);
						callback(null,entry);
					}
					else {
						this.emit("strok",res,instance,flow);
						callback(null,res);
					}
				});
			}catch(err) {
				this.emit("strerr",err,instance,flow);
				callback(null,entry);
			}
		}
	});
	tr.flow = flow;
	tr.instance = instance;
	tr.on("error",error);
	return tr;
}

module.exports = {
	reader,transform,writer
}
