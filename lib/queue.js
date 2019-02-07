const Semaphore = require('./semaphore');

class Queue {
	constructor(maxSize) {
		this.data = [];
		this.sem = maxSize? new Semaphore(maxSize) : null;
		this.mutex = new Semaphore(1);
		this.ready = this.mutex.take();
	}

	size() {
		return this.data.length;
	}

	stats() {
		return `Data: ${this.data.length}`;
	}

	async push(item, callback) {
		await this.ready;
		if(this.sem) await this.sem.take();
		this.data.unshift(item);
		if(!this.mutex.available()) {
			this.mutex.leave();
		}
		if(callback) {
			callback();
		}
	}

	async pop(callback) {
		await this.ready;
		await this.mutex.take();
		let item = this.data.pop();
		if(this.sem) this.sem.leave();
		if(callback) callback(null,item);
		return item;
	}
}

module.exports = Queue;
