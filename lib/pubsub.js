const
	net = require('net'),
	os = require('os'),
	EventEmitter = require('events'),
	fs = require('fs-extra');

const UNIX = os.platform() != 'win32';
const SFILE = `/tmp/nsyslog_${process.pid}`;
const DELIM = '\n|||#END#|||';

class Server extends EventEmitter {
	async bind(sfile,port) {
		sfile = sfile || SFILE;
		await fs.ensureFile(sfile);
		await fs.unlink(sfile);

		this.server = net.
			createServer(stream=>{
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
						this.emit('message',msg);
					}
				});

			}).
			listen(port? port: sfile, port? sfile : null);
	}
}

class Client {
	async connect(sfile, port) {
		this.client = net.createConnection(port? port : sfile, port? sfile : null);
		return this.client;
	}

	send(msg) {
		let buff = Buffer.alloc(2+msg.length+1);
		buff.writeUInt16BE(msg.length,0);
		buff.fill(msg,2);
		return new Promise(ok=>this.client.write(buff,ok));
	}
}

if(!module.parent) {
	async function main() {
		let seq = -1;
		let server = new Server();
		let client = new Client();

		if(UNIX) {
			await server.bind();
			await client.connect(SFILE);
		}
		else {
			await server.bind('localhost',9898);
			await client.connect('localhost',9898);
		}

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
