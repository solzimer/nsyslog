const
	logger = require('../logger'),
	Transporter = require("./");

class ReemitTransporter extends Transporter {
  constructor(id) {
    super(id);
  }

	async configure(config, callback) {
		callback();
	}

	get needQueue() {
		return true;
	}

	get queue() {
		return this._queue;
	}

	set queue(queue) {
		this._queue = queue;
	}

	transport(entry, callback) {
		this._queue.write(entry,null,(err)=>{
			callback(err,entry);
		});
  }
}

module.exports = ReemitTransporter;
