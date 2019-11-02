const Semaphore = require('./semaphore');

/**
 * In-memory asynchronous LIFO buffer
 * @class
 * @description Queue class implements an asynchronous LIFO queue of limited size
 * @param {number} maxSize Queue max size
 */
class Queue {
	constructor(maxSize) {
		this.data = [];
		this.sem = maxSize? new Semaphore(maxSize) : null;
		this.mutex = new Semaphore(1);
		this.ready = this.mutex.take();
	}

	/**
	 * Return current queue size (number of stored elements)
	 * @return {number} Queue size
	 */
	size() {
		return this.data.length;
	}

	/**
	 * Returns a formatted string of the queue size
	 * @return {string} Queue size message
	 */
	stats() {
		return `Data: ${this.data.length}`;
	}

	/**
	 * Pushes an element to the end of the queue. This method is asynchronous, so
	 * in case the queue is full, it doen't block the process; it simply awaits
	 * asynchronously until a slot is available.
	 * @param  {Object}   item  Item to store
	 * @param  {Function} callback Callback function. Called when push method ends succesfully
	 * @return {Promise}  Same as callback. Promise is resolved when the item has
	 * been pushed to the queue
	 */
	async push(item, callback) {
		await this.ready;

		if(this.sem) {
			await this.sem.take();
		}

		this.data.unshift(item);

		if(!this.mutex.available()) {
			this.mutex.leave();
		}

		if(callback) {
			callback();
		}
	}

	/**
	 * Removes and returns the item from the start of the queue
	 * @param  {number}   [timeout]  Await timeout. If this time expires, callback and
	 * promise returns an undefined item.
	 * @param  {Function} callback Callback function
	 * @return {Promise}  Same as callback. If tiemout expires, promise is not rejected; insted,
	 * it's resolved with an undefined value
	 */
	async pop(timeout,callback) {
		if(typeof(timeout)=='function') {
			callback = timeout;
			timeout = -1;
		}

		await this.ready;

		while(!this.data.length) {
			await this.mutex.take();
		}

		let item = this.data.pop();

		if(this.sem && this.sem.sem.current>0) {
			this.sem.leave();
		}

		if(callback) {
			callback(null,item);
		}

		return item;
	}
}

module.exports = Queue;
