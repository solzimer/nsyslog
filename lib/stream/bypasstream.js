const
	Component = require('../component'),
	{PROC_MODE} = require('../constants'),
	Transform = require("stream").Transform;

const MAX = 10;

/**
 * Bypass Stream class
 * @class
 * @memberof Streams
 * @extends Transform
 * @description <p>As its name says, Bypass Stream simply outputs the entry as
 * soon as its read. It's used mainly as a generic joint between other streams</p>
 * <p>NSyslog uses Bypass streams to pipe {@link InputWrapper} instances to flows</p>
 * @param {string} name Stream name / ID
 */
class BypassStream extends Transform {
	constructor(name) {
		super({
			objectMode:true,
			highWaterMark:MAX
		});
		this.instance = {id:name || `Bypass_${Component.nextSeq()}`};
		Component.handlePipe(this);
	}

	/**
	 * Subscribe to entry output (from {@link InputWrapper} streams)
	 * @param  {String} id      Input ID
	 * @param  {function} handler Callback function
	 */
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

	/**
	 * SUnsbscribe from entry output (from {@link InputWrapper} streams)
	 * @param  {String} id      Input ID
	 * @param  {function} handler Callback function
	 */
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

	/**
	 * Closes the stream
	 * @param  {Function} callback Callback function
	 */
	close(callback) {
		callback();
	}
}

module.exports = BypassStream;
