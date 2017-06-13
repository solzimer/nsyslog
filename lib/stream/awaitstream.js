const Transform = require("stream").Transform;
const semaphore = require("semaphore");

class AwaitStream extends Transform {
  constructor(options) {
		options = options || {};
		options.objectMode = true;

    super(options);
		this._highWaterMark = options.highWaterMark||16;
		this._sem = semaphore(this._highWaterMark);
  }

	_leave() {
		setImmediate(()=>{
			this._sem.leave();
		});
	}

	_transform(entry, encoding, callback) {
		this._sem.take(()=>{
			callback(null,entry);
			if(entry.then) {
				entry.then(()=>this._leave(),()=>this._leave());
			}
			else {
				this._leave();
			}
		});
  }
}

module.exports = AwaitStream;
