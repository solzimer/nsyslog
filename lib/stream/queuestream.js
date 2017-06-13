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

  _read(size) {
		this.queue.peek((err,res)=>{
			if(err) {
				process.nextTick(() => this.emit('error', err));
			}
			else {
				this.push(res);
			}
		});
  }
}

module.exports = QueueStream;
