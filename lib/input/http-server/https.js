const
	https = require('https'),
	url = require('url'),
	extend = require('extend'),
	TLS = require('../../tls'),
	logger = require('../../logger');

const DEF_OPTS = {
	rejectUnauthorized: false
};

class HttpsServer {
	constructor(format, host, port, options) {
		this.host = host || undefined;
		this.port = port || 8080;
		this.format = format || "json";
		this.server = null;
		this.eserver = { format: this.format, port: this.port, host: this.host };
		this.options = extend({}, DEF_OPTS, options);
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
				JSON.parse(s) : s
		};
	}

	async start(callback) {
		let options = this.options;

		try {
			options = await TLS.configure(options, options.$path);
		} catch (err) {
			callback(err);
		}

		this.server = https.createServer(options, (req, res) => {
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
					res.writeHead(200, 'OK', { 'Content-Type': 'text/plain' });
					res.end();

					try {
						let entry = this.entry(req, body);
						callback(null, entry);
					} catch (error) {
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

}

module.exports = HttpsServer;
