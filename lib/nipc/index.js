const
	net = require('net'),
	EventEmiter = require('events');

class Server extends EventEmiter {
	constructor(port) {
		this.port = port || 0;
		this.server = net.
			createServer(this.handle.bind(this)).
			listen(this.port);

		this.ready = new Promise((ok,rej)=>{
			this.server.on('listening',ok);
			this.server.on('error',rej);
		});
	}

	get endpoint() {
		return `tcp://localhost:${this.server.address().port}`;
	}

	handle(socket) {
		socket.name = socket.remoteAddress + ":" + socket.remotePort

	  socket.on('data', data => {

	  });

	  socket.on('end', () => {

	  });

	}
}
