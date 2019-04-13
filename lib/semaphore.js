const semaphore = require("semaphore");

class Semaphore {
	constructor(capacity) {
		this.sem = semaphore(capacity||1);
		this.alive = true;
	}
	destroy() {
		this.alive = false;
		while(this.sem.current) {
			this.sem.leave();
		}
	}
	take(n) {
		return new Promise((ok,rej)=>{
			if(!this.alive) return rej();
			this.sem.take(n||1,()=>{
				return this.alive? ok() : rej();
			});
		});
	}
	leave(n) {return this.sem.leave(n||1);}
	available(n) {return this.sem.available(n||1);}
	get current() {return this.sem.current;}
}

module.exports = Semaphore;
