const
	net = require('net'),
	os = require('os'),
	EventEmitter = require('events'),
	logger = require('./logger'),
	Semaphore = require('./semaphore'),
	fs = require('fs-extra');

const UNIX = os.platform() != 'win32';
const SFILE = `/tmp/nsyslog_${process.pid}`;
const CODES = {
	ACK_REEMIT : 0x01,
	ERR_REEMIT : 0x02,
};

function handleServer(stream) {
	let buff = null, len = -1;

	stream.on('error',err=>{
		logger.error(err);
	});

	stream.on('data',data=>{
		try {
			buff = buff? Buffer.concat([buff,data]) : data;
		}catch(err) {
			console.log(buff,data);
		}

		// First read
		if(len<0)
			len = buff.readUInt16BE();

		while(buff.length>=(len+2)) {
			// Read message
			let msg = buff.slice(2,len+2).toString();
			try {
				msg = JSON.parse(msg);
			}catch(err) {
				logger.error('Error parsing incoming message',err.message,msg);
				stream.write(Buffer.from([CODES.ERR_REEMIT]));
			}

			// Emit message to subscribers (nsyslog) and send response to client
			this.emit('message',msg,(code)=>stream.write(Buffer.from([code])));

			buff = buff.slice(len+2);
			if(buff.length>=2) {
				len = buff.readUInt16BE();
			}
			else {
				len = -1;
				break;
			}
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
		if(UNIX) {
			await fs.ensureFile(SFILE);
			await fs.unlink(SFILE);
			this.unix = net.
				createServer(handleServer.bind(this)).
				listen(SFILE);
		}

		await new Promise((ok,rej)=>{
			this.server = net.
				createServer(handleServer.bind(this)).
				listen(0, host);

			this.server.on('listening',ok);
			this.server.on('error',err=>{
				logger.error(err);
				rej(err);
			});
		});

		this.link =  {
			pid : process.pid,
			local : UNIX? {host:SFILE} : false,
			remote : {host,port:this.server.address().port}
		};

		logger.info(`Server bind for process ${process.pid}`,this.link);
		return this.link;
	}
}

class Client extends EventEmitter {
	constructor() {
		super();
		this.pending = 0;
	}

	async connect(sfile, port) {
		this.client = net.createConnection(port? port : sfile, port? sfile : null);
		this.client.on('error',err=>{
			this.emit('error',err);
		});
		this.client.on('data',buff=>{
			this.pending--;
			let len = buff.length;
			for(let i=0;i<len;i++) {
				let code = buff.readUInt8(i);
				this.emit('response',code);
			}
		});
		return this.client;
	}

	send(msg) {
		this.pending++;
		msg = JSON.stringify(msg);
		let buff = Buffer.from(msg);
		let len = Buffer.alloc(2);
		len.writeUInt16BE(buff.length);
		return Promise.all([
			new Promise(ok=>this.client.write(len,ok)),
			new Promise(ok=>this.client.write(buff,ok))
		]);
	}
}

if(module.parent) {
	module.exports = {Server, Client, Code:CODES};
}
else {
	let seq = -1;
	let server = new Server();
	let client = new Client();

	server.bind('localhost').then(async(conn)=>{
		await client.connect(conn.remote.host,conn.remote.port);

		server.on('message',msg=>{
			let j = msg.count;
			if(j-seq!=1) throw new Error(`Error => ${seq} - ${j}`);
			seq = j;
			if((j%100)==0) console.log(j);
		});

		for(let i=0;i<100000;i++) {
			let msg = {"originalMessage":"This is a pull input: "+Math.random(),"input":"pusher","type":"mypull","$key":"pusher@mypush","$$reemit":"fork3","$reemit":"fork3",count:i};
			await client.send(msg);
		}
	});
}
