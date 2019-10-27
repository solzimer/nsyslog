const
	Component = require('../component'),
	logger = require('../logger'),
	{PROC_MODE} = require('../constants'),
	Duplex = require("stream").Duplex,
	Transform = require("stream").Transform;

const MAX = 10;

class BypassStream extends Transform {
	constructor(name) {
		super({
			objectMode:true,
			highWaterMark:MAX
		});
		this.instance = {id:name || `Bypass_${Component.nextSeq()}`};
		Component.handlePipe(this);
	}

	subscribe(id, handler) {
		this.hdls = this.hdls || new Map();
		if(!this.hdls.has(id)) this.hdls.set(id, new Set());
		if(!this.subscribed) {
			this.subscribed = (data)=>{
				let id = data.input;
				if(this.hdls.has(id)) {
					this.hdls.get(id).forEach(cb=>cb(this.instance.id,id,PROC_MODE.output,data));
				}
			};

			this.on('data', this.subscribed);
			this.hdls.get(id).add(handler);
		}
	}

	unsubscribe(id, handler) {
		this.hdls = this.hdls || new Map();
		if(!this.hdls.has(id)) this.hdls.set(id, new Set());

		let hdlist = this.hdls.get(id);
		hdlist.delete(handler);
		if(!hdlist.size) this.hdls.delete(id);
		if(!this.hdls.size && this.subscribed) {
			this.removeListener('data',this.subscribed);
			this.subscribed = null;
		}
	}

	_transform(chunk,encondig,callback) {
		callback(null,chunk);
	}

	close(callback) {
		callback();
	}
}

module.exports = BypassStream;
