const
	Worker = require('tiny-worker'),
	Semaphore = require('semaphore'),
	os = require('os');

const SIZE = os.cpus().length;
var workerPool = Semaphore(SIZE);

function releaseWorker() {
	if(this.onend) this.onend();
	if(this.terminate) this.terminate();
	workerPool.leave();
}

function worker(fn,callback) {
	workerPool.take(()=>{
		var worker = new Worker(fn);
		worker.release = releaseWorker;
		callback(worker);
	});
}

module.exports = {
	Worker : worker,
	size : SIZE
}
