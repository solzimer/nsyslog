const Duplex = require("stream").Duplex;

class QueueStream extends Duplex {
  constructor(queue,options) {
		options = options || {};
		options.objectMode = true;

    super(options);
		this.queue = queue;
  }

	_write(chunk, encoding, callback) {
		this.queue.push(chunk,callback);
  }

  async _read(size) {
		try {
			let data = await this.queue.peek();
			this.push(data);
		}catch(err) {
			this.emit('error', err);
		}
  }
}

module.exports = QueueStream;
