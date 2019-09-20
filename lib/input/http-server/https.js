const
	https = require('https'),
	extend = require('extend'),
	TLS = require('../../tls'),
	logger = require('../../logger');

const DEF_OPTS = {
	key: './config/server.key',
	cert: './config/server.crt',
	rejectUnauthorized : false
}

class HttpsServer {
	constructor(format,host,port,options) {
		this.host = host || undefined;
		this.port = port || 8080;
		this.format = format || "json";
		this.server = null;
		this.eserver = {format:this.format, port:this.port, host:this.host};
		this.options = extend({},DEF_OPTS,options);
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

	async start(callback) {
		let options = this.options;

		try {
			options = await TLS.configure(options, options.$path);
		}catch(err) {
			callback(err);
		}

		this.server = https.createServer(options,(req, res) => {
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
		this.server.on('error',logger.error.bind(logger));
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

module.exports = HttpsServer;
