const
	logger = require('../logger'),
	Component = require('../component'),
	Duplex = require("stream").Duplex,
	Queue = require('../queue');

const MAX = 10;

class FilterStream extends Duplex {
	constructor(name,filter) {
		super({
			objectMode:true,
			highWaterMark:MAX
		});
		this.instance = {id:name || `Filter_${Component.nextSeq()}`};
		this.filter = filter;
		this.queue = new Queue(MAX);
		Component.handlePipe(this);
	}

	async _write(entry,encondig,callback) {
		if(!this.filter(entry)) {
			logger.silly(`Filter ${this.instance.id} doesn't match entry`,entry);
			callback();
		}
		else {
			logger.silly(`Filter ${this.instance.id} matches entry`,entry);
			await this.queue.push(entry);
			callback();
		}
	}

	async _read() {
		let entry = await this.queue.pop();
		this.push(entry);
	}

	close(callback) {
		callback();
	}
}

module.exports = FilterStream;
