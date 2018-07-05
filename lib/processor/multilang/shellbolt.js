const
	fs = require("fs"),
	extend = require("extend"),
	spawn = require('child_process').spawn,
	logger = require('../../logger'),
	EventEmitter = require('events').EventEmitter;

class Bolt extends EventEmitter {
	constructor(worker) {
		super();

		this.worker = worker;
		this.data = "";
		this.child = "";
		this.ready = new Promise((ok,rej)=>{
			this._ok = ok;
			this._rej = rej;
		});
	}

	start() {
		let args = this.worker.path.split(" ");
		let cmd = args.shift();
		this.data = "";
		this.closed = false;
		this.child = spawn(cmd,args);
		this.child.on("error",this.error.bind(this));
		this.child.stdout.setEncoding('utf8');
		this.child.stdin.setEncoding('utf8');
		this.child.stdout.on('data', this.message.bind(this));
		this.child.stderr.on('data', this.error.bind(this));
		this.child.stdout.on('error', this.error.bind(this));
		this.child.stdin.on('error', this.error.bind(this));
		this.child.stderr.on('error', this.error.bind(this));
		this.child.on('close',code=>{
			this.closed = true;
			this.emit('close',code);
		});

		return this.ready;
	}

	stop(soft) {
		this.ready = new Promise((ok,rej)=>{
			this._ok = ok;
			this._rej = rej;
		});
		if(!soft) {
			this.closed = true;
			this.child.kill("SIGINT");
		}
	}

	send(json) {
		setImmediate(()=>{
			if(!this.closed)
				this.child.stdin.write(JSON.stringify(json)+"\nend\n");
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

	error(chunk) {
		logger.error(chunk.toString());
	}

	message(chunk) {
		this.data += chunk
		var cmds = this.data.split(/end\n/);
		while(cmds.length>1) {
			let command = cmds.shift();
			this.processMessage(command);
			this.data = cmds.join("end\n");
		}
	}

	processMessage(data) {
		try {
			var msg = JSON.parse(data);
		}catch(err) {
			logger.debug(err,data);
			return;
		}

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
