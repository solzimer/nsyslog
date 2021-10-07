const
	Input = require('.'),
	MachineCollector = require('../machine');

class MachineInput extends Input {
	constructor(id,type) {
		super(id,type);
		this.collector = MachineCollector.default;
		this.cb = null;
	}

	get mode() {
		return Input.MODE.push;
	}

	async configure(config,callback) {
		callback();
	}

	start(callback) {
		this.cb = (data)=>callback(null,{
			id : this.id,
			type : this.type,
			originalMessage : data
		});
		this.collector.on(MachineCollector.Event.status,this.cb);
	}

	stop(callback) {
		if(this.cb) {
			this.collector.removeListener(MachineCollector.Event.status,this.cb);
			this.cb = null;
		}
		callback();
	}

	pause(callback) {
		if(this.cb) {
			this.collector.removeListener(MachineCollector.Event.status,this.cb);
		}
		callback();
	}

	resume(callback) {
		if(this.cb) {
			this.collector.removeListener(MachineCollector.Event.status,this.cb);
			this.collector.on(MachineCollector.Event.status,this.cb);
		}
		callback();
	}

	key(entry) {
		return `${entry.input}:${entry.type}`;
	}
}

module.exports = MachineInput;
