const
	http = require('http'),
	logger = require('../../logger');

class HttpServer {
	constructor(format,host,port) {
		this.host = host || undefined;
		this.port = port || 8080;
		this.format = format || "json";
		this.server = null;
		this.eserver = {format:this.format, port:this.port, host:this.host};
	}

	entry(req,s) {
		let client = req.client;
		return {
			timestamp: Date.now(),
			server: this.eserver,
			client: {address:client.remoteAddress,port:client.remotePort},
			originalMessage: this.format=='json'?
				JSON.parse(s) : s
		}
	}

	start(callback) {
		this.server = http.createServer((req, res) => {
			if(this.paused) {
				res.writeHead(200,'OK',{'Content-Type': 'text/plain'});
				res.end();
			}
			else if(req.method == 'POST' || req.method == 'PUT') {
	        let body = '';

					req.on('data', (data)=>{
						body += data;
						// FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
						if (body.length > 1e6) {
							req.connection.destroy();
            }
					});

	        req.on('end', ()=>{
						res.writeHead(200, 'OK', {'Content-Type': 'text/plain'});
        		res.end();

						try {
							let entry = this.entry(req,body);
							callback(null,entry);
						}catch(error) {
							callback(error);
						}
	        });
	    }
			else {
				res.writeHead(405, {'Content-Type': 'text/plain'});
        res.end();
			}
		});

		this.server.listen(this.port,this.host);
	}

	stop(callback) {
		this.server.close(callback);
	}

	pause(callback) {
		this.paused = true;
		callback();
	}

	resume(callback) {
		this.paused = false;
		callback();
	}

}

module.exports = HttpServer;
