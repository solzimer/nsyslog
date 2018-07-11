if(typeof(THREAD)=='undefined') {
	const
		WORKERS = 4,
		fs = require("fs"),
		napa = require('napajs'),
		zone = napa.zone.create('threadbolt', { workers: WORKERS });
		extend = require("extend"),
		spawn = require('child_process').spawn,
		EventEmitter = require('events').EventEmitter;

	class Bolt extends EventEmitter {
		constructor(worker) {
			super();

			zone.broadcast(`
				const THREAD = true;
				const Bolt = require(${__dirname}'/threadbolt');
				var bolt = new Bolt("${worker.path}");
			`);

			this.ready = Promise.resolve(true);
		}

		start() {
			zone.broadcast(`bolt.start()`);
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
}
else {
	const
		fs = require("fs"),
		extend = require("extend"),
		EventEmitter = require('events').EventEmitter;

	class Bolt extends EventEmitter {
		constructor(path) {
			super();

			this.data = "";
			this.Clasz = require(path);
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

		async send(json) {
			await this.ready;
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
}
