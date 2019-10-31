const
	Component = require('../component'),
	logger = require('../logger'),
	Duplex = require("stream").Duplex;

const MAX = 1000;

/**
 * Queue Stream class
 * @class
 * @memberof Streams
 * @extends Duplex
 * @description <p>Queue Stream is a {@link Duplex} stream. It stores data entries to a persistent
 * internal datastore so they can be read later without causing stream exhaustion or overflow.</p>
 * <p>When a data entry is written to the stream, it is stored to a disk datastore. Later, when the
 * stream <b>read</b> method is invoked, the entry is read and removed from the datastore</p>
 * <p>Internally, a LevelDB based datastore is used ({@link https://www.npmjs.com/package/fileq})</p>
 */
class QueueStream extends Duplex {
  constructor(name,queue,options) {
		options = options || {};
		options.objectMode = true;
		options.highWaterMark = options.highWaterMark || MAX;

    super(options);
		this.queue = queue;
		this.buffer = [];
		this.idx = 0;
		this.instance = {id:name||`Queue_${Component.nextSeq()}`};
		Component.handlePipe(this);
  }

	_write(chunk, encoding, callback) {
		this.queue.push(chunk,callback);
  }

  async _read(size) {
		let read = false;
		let retry = 10;

		while(!read) {
			try {
				let data = await this.queue.peek();
				this.push(data);
				read = true;
			}catch(err) {
				logger.error(err);
				this.emit('stream_error', err);
				if(--retry) {
					await new Promise(ok=>setTimeout(ok,1000));
				}
				else {
					this.push(null);
				}
			}
		}
  }

	close() {
		return this.queue.close();
	}
}

module.exports = QueueStream;
