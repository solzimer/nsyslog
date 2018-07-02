const
	fs = require("fs"),
	extend = require("extend"),
	spawn = require('child_process').spawn,
	logger = require('../../logger'),
	EventEmitter = require('events').EventEmitter;

class Bolt extends EventEmitter {
	constructor() {
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
		this.child = spawn("node",[worker.path]);
		this.child.on("error",this.error.bind(this));
		this.child.stdout.setEncoding('utf8');
		this.child.stdin.setEncoding('utf8');
		this.child.stdout.on('data', this.message.bind(this));
		this.child.stderr.on('data', this.error.bind(this));
		this.child.on('close',code=>logger.info("ShellBolt closed",code,data));

		return this.ready
	}

	send(json) {
		setImmediate(()=>{
			child.stdin.write(JSON.stringify(json)+"\nend\n");
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
		logger.error(chunk);
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
			logger.error(err,data);
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
