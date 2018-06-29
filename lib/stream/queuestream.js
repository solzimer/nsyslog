const
	logger = require('../logger'),
	Duplex = require("stream").Duplex;
	Transform = require("stream").Transform;

const MAX = 10000;

class QueueStream extends Duplex {
  constructor(queue,options) {
		options = options || {};
		options.objectMode = true;

    super(options);
		this.queue = queue;
		this.buffer = [];
		this.idx = 0;
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
}

module.exports = QueueStream;
