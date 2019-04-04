const
	EventEmiter = require('events'),
	logger = require('./logger');

var seq = 0;

const Events = {
	ack : 'stream_ack',
	error : 'stream_error',
	data : 'stream_data',
	transfer : 'stream_transfer'
}

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
			/*
			src.on('data',(entry)=>{
				logger.silly(`Data from ${src.instance.id} to ${stream.instance.id}`);
				stream.emit(Events.transfer,entry,{from:src,to:stream});
			});
			*/
		});
	}
}

Component.Events = Events;

module.exports = Component;
