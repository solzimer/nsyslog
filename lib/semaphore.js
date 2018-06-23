const semaphore = require("semaphore");

class Semaphore {
	constructor(capacity) {this.sem = semaphore(capacity||1);}
	take(n) {return new Promise(ok=>this.sem.take(n||1,ok));}
	leave(n) {return this.sem.leave(n||1);}
	available(n) {return this.sem.available(n||1);}
}

module.exports = Semaphore;
