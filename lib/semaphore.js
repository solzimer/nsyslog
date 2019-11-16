const semaphore = require("semaphore");

/**
 * Async Semaphore implementation
 * @description <p>A Semaphore implementation to control data
 * access from async functions</p>
 * @class
 * @param {number} capacity Initial capacity (number of slots)
 * @example
 * const Semaphore = require('nsyslog/lib/semaphore');
 *
 * let sem = new Semaphore(5);
 * while(true) {
 * 	await sem.take();
 * 	setTimeout(()=>{
 * 		console.log('Hi there!');
 * 		sem.leave();
 * 	}, Math.random()*1000);
 * }
 */
class Semaphore {
	constructor(capacity) {
		this.sem = semaphore(capacity||1);
		this.alive = true;
	}

	/**
	 * Destroys the semaphore, meaning that all taken
	 * slots are freed and all take calls will be rejected
	 */
	destroy() {
		this.alive = false;
		while(this.sem.current) {
			this.sem.leave();
		}
	}

	/**
	 * Asks for n slots to be taken
	 * @param  {number} [n] Slots to take (1 by default)
	 * @return {Promise} Resolved when the slots are available
	 */
	take(n) {
		return new Promise((ok,rej)=>{
			if(!this.alive) return rej();
			this.sem.take(n||1,()=>{
				return this.alive? ok() : rej();
			});
		});
	}

	/**
	 * Release n taken slots
	 * @param  {number} [n] Slots to release (1 by default)
	 */
	leave(n) {return this.sem.leave(n||1);}

	/**
	 * Returns if there are available slots to take without
	 * await for them
	 * @param  {number} n Number of slots
	 * @return {boolean}
	 */
	available(n) {return this.sem.available(n||1);}

	/**
	 * Gets the current number of taken slots
	 * @return {number}
	 */
	get current() {return this.sem.current;}
}

module.exports = Semaphore;
