const
	http = require('http'),
	url = require('url'),
	acker = require('../../acker'),
	logger = require('../../logger');

class HttpServer {
	constructor(id, format, host, port, ack) {
		this.host = host || undefined;
		this.port = port || 8080;
		this.format = format || "json";
		this.server = null;
		this.eserver = { format: this.format, port: this.port, host: this.host };
		if(ack) {
			this.ackmap = new Map();
			acker.on(id,(entry,message)=>this.endRequest(entry,message));		
		}
	}

	entry(req, s) {
		let client = req.client;
		return {
			timestamp: new Date(),
			server: this.eserver,
			headers: req.headers,
			params: url.parse(req.url, true).query,
			client: { address: client.remoteAddress, port: client.remotePort, url: req.url },
			originalMessage: this.format == 'json' ?
				JSON.parse(s||"{}") : s
		};
	}

	start(callback) {
		this.server = http.createServer((req, res) => {
			if (this.paused) {
				res.writeHead(200, 'OK', { 'Content-Type': 'text/plain' });
				res.end();
			}
			else if (req.method == 'POST' || req.method == 'PUT') {
				let body = '';

				req.on('data', (data) => {
					body += data;
					// FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
					if (body.length > 1e6) {
						req.connection.destroy();
					}
				});

				req.on('end', () => {
					if(!this.ack) {
						res.writeHead(200, 'OK', { 'Content-Type': 'text/plain' });
						res.end();	
					}

					try {
						let entry = this.entry(req, body);
						if(this.ack) {
							let ackid = `${Date.now()}_${Math.random()}`;
							entry[this.ack] = ackid;
							this.ackmap.set(ackid, res);
						}
						callback(null, entry);
					} catch (error) {
						res.writeHead(400, { 'Content-Type': 'text/plain' });
						res.end();
						callback(error);
					}
				});
			}
			else {
				res.writeHead(405, { 'Content-Type': 'text/plain' });
				res.end();
			}
		});

		this.server.listen(this.port, this.host);
		this.server.on('error', logger.error.bind(logger));
	}

	stop(callback) {
		if (this.server)
			this.server.close(callback);
		else
			callback();
	}

	pause(callback) {
		this.paused = true;
		callback();
	}

	resume(callback) {
		this.paused = false;
		callback();
	}

	endRequest(entry, msg) {
		let ackid = entry[this.ack];
		if(!ackid) {
			return;
		}
		else if(!this.ackmap.has(ackid)) {
			logger.warn(`${this.id} Cannot ack entry with unknown ack key ${ackid}`);
			return;
		}
		
		entry[this.ack] = undefined;
		let res = this.ackmap.get(ackid);
		msg = extend({body:"",statusCode:200,statusLine:'OK'},msg);

		let ctype = typeof(msg.body)=='object'? 'application/json':'text/plain';
		res.writeHead(msg.statusCode, msg.statusLine, {'Content-Type': ctype});
		res.write(typeof(msg.body)=='object'? JSON.stringify(msg.body) : msg.body);
		res.end();
	}
}

module.exports = HttpServer;
