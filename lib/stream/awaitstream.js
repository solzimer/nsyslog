const
	Component = require('../component'),
	Transform = require("stream").Transform,
	semaphore = require("semaphore");

/**
 * Await Stream class
 * @class
 * @memberof Streams
 * @extends Transform
 * @description <p>AwaitStream is an asynchronous semaphore controlled stream.<p>
 * <p>It uses up to <b>options.highWaterMark</b> slots of a semaphore to
 * control the stream I/O</p>
 * <p>This stream really does nothing; it's an empty {@link Transform} stream used
 * for debugging purposes</p>
 * @param {Object} options Configuration options
 * @param {number} options.highWaterMark Max entries handled by the stream at the same time
 */
class AwaitStream extends Transform {
  constructor(options) {
		options = options || {};
		options.objectMode = true;

    super(options);
		this._highWaterMark = options.highWaterMark||16;
		this._sem = semaphore(this._highWaterMark);
		this.instance = {id:`Await_${Component.nextSeq()}`};
		Component.handlePipe(this);
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
