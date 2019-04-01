const
	net = require('net'),
	os = require('os'),
	fs = require('fs-extra');

const UNIX = os.platform() != 'win32';
const SFILE = `/tmp/nsyslog_${process.pid}`;
const DELIM = '\n|||#END#|||';

class Server {
	async bind(sfile) {
		sfile = sfile || SFILE;
		await fs.ensureFile(sfile);
		await fs.unlink(sfile);

		this.server = net.
			createServer(stream=>{
				let s = '';

				stream.on('data',data=>{
					s += data;
					if(data.indexOf(DELIM)>=0) {
						let r = s.split(DELIM);
						do {
							let msg =  r.shift();
							console.log('MSG',msg);
						}while(r.length>1);

						// Leftover
						if(r[0].length) {
							s = r[0];
						}
						else {
							s = '';
						}
					}
				});

			}).
			listen(sfile);
	}
}

class Client {
	async connect(sfile) {
		this.client = net.createConnection(sfile);
		return this.client;
	}

	send(msg) {
		return new Promise(ok=>this.client.write(`${msg}${DELIM}`,ok));
	}
}

if(!module.parent) {
	async function main() {
		let server = new Server();
		let client = new Client();

		await server.bind();
		await client.connect(SFILE);

		for(let i=0;i<10;i++) {
			await client.send(`This is a msg nº: ${i}`);
		}
	}

	main();
}
