const
	fs = require("fs"),
	extend = require("extend"),
	spawn = require('child_process').spawn,
	EventEmitter = require('events').EventEmitter;

class Bolt extends EventEmitter {
	constructor(worker) {
		super();

		this.worker = worker;
		this.data = "";
		this.Clasz = require(worker.path);
		this.instance = null;
		this.ready = new Promise((ok,rej)=>{
			this._ok = ok;
			this._rej = rej;
		});
	}

	start() {
		this.instance = new this.Clasz();
		this.instance.sendMsgToParent = (msg)=>{
			this.processMessage(msg);
		}
		return this.ready;
	}

	stop() {
		this.closed = true;
	}

	send(json) {
		setImmediate(()=>{
			try {
				this.instance.handleNewMessage(JSON.stringify(json));
			}catch(err) {
				this.emit('error',err,json);
			}
		});
	}

	process(id,tuple) {
		this.send({
			id : id,
			comp : 1,
			stream : 1,
			task : 1,
			tuple : tuple
		});
	}

	processMessage(msg) {
		if(msg.pid) {
			this.pid = msg.pid;
			this.emit("pid",msg);
			this._ok(this);
		}
		else if(msg.command) {
			if(msg.command=="log") {
				this.emit("log",msg);
			}
			else if(msg.command=="emit") {
				this.emit("emit",msg);
			}
			else if(msg.command=="ack") {
				this.emit("ack",msg);
			}
			else if(msg.command=="fail") {
				this.emit("fail",msg);
			}
		}
	}
}

module.exports = Bolt;
