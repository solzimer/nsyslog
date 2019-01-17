const
	Component = require('../component'),
	logger = require('../logger'),
	Duplex = require("stream").Duplex;

const MAX = 10000;

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

		while(!read) {
			try {
				let data = await this.queue.peek();
				this.push(data);
				read = true;
			}catch(err) {
				logger.error(err);
				this.emit('stream_error', err);
			}
		}
  }

	close() {
		return this.queue.close();
	}
}

module.exports = QueueStream;
