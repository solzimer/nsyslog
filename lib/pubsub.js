const
	net = require('net'),
	os = require('os'),
	EventEmitter = require('events'),
	logger = require('./logger'),
	fs = require('fs-extra');

const UNIX = os.platform() != 'win32';
const SFILE = `/tmp/nsyslog_${process.pid}`;
const DELIM = '\n|||#END#|||';

function handleServer(stream) {
	let buff = null, len = -1;

	stream.on('data',data=>{
		try {
			buff = buff? Buffer.concat([buff,data]) : data;
		}catch(err) {
			console.log(buff,data);
		}

		if(len<0)
			len = buff.readUInt16BE();

		while(buff.length>=(len+3)) {
			let msg = buff.slice(2,len+3).toString();
			buff = buff.slice(len+3);
			if(buff.length>=2)
				len = buff.readUInt16BE();

			msg = JSON.parse(msg);
			this.emit('message',msg);
		}
	});
}

class Server extends EventEmitter {
	constructor() {
		super();
		this.unix = null;
		this.server = null;
		this.link = null;
	}

	async bind(host) {
		await fs.ensureFile(SFILE);
		await fs.unlink(SFILE);

		if(UNIX) {
			this.unix = net.
				createServer(handleServer.bind(this)).
				listen(SFILE);
		}

		await new Promise(ok=>{
			this.server = net.
				createServer(handleServer.bind(this)).
				listen(0, host);

			this.server.on('listening',ok);
		});

		this.link =  {
			pid : process.pid,
			local : {host:SFILE},
			remote : {host,port:this.server.address().port}
		}

		logger.info(`Server bind for process ${process.pid}`,this.link);
		return this.link;
	}
}

class Client {
	async connect(sfile, port) {
		this.client = net.createConnection(port? port : sfile, port? sfile : null);
		return this.client;
	}

	send(msg) {
		msg = JSON.stringify(msg);
		let buff = Buffer.alloc(2+msg.length+1);
		buff.writeUInt16BE(msg.length,0);
		buff.fill(msg,2);
		return new Promise(ok=>this.client.write(buff,ok));
	}
}

if(module.parent) {
	module.exports = {Server, Client};
}
else {
	async function main() {
		let seq = -1;
		let server = new Server();
		let client = new Client();

		let chost = UNIX? SFILE : 'localhost';

		await server.bind('localhost');
		await client.connect(chost);

		server.on('message',msg=>{
			let j = parseInt(msg.substring(msg.indexOf(":")+1).trim());
			if(j-seq!=1) throw new Error(`Error => ${seq} - ${j}`);
			seq = j;
			if(!(j%100)) console.log(j);
		});

		for(let i=0;i<100000;i++) {
			await client.send(`This is a msg nº: ${i}`);
		}
	}

	main();
}
