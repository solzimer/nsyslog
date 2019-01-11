const
	EventEmiter = require('events'),
	logger = require('./logger');

var seq = 0;

class Component extends EventEmiter {
	constructor(id,type) {
		super();
		this.id = id;
		this.type = type;
	}

	configure(cfg,callback) {
		callback();
	}

	start(callback) {
		callback();
	}

	pause(callback) {
		callback();
	}

	resume(callback) {
		callback();
	}

	stop(callback) {
		callback();
	}

	key(entry) {
		if(entry.$key) return entry.$key;
		return `${this.id}@${this.type}`;
	}

	static nextSeq() {
		return seq++;
	}
	
	static handlePipe(stream) {
		stream.on('pipe',src=>{
			logger.info(`${src.instance.id} piped to ${stream.instance.id}`);
			src.on('data',()=>{
				//stream.emit
			});

		});
	}
}

module.exports = Component;
