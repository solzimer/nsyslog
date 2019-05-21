const
	logger = require('./logger'),
	Shm = require('./shm'),
	PubSub = require('./pubsub');

var queueStream = null;
var onemit = ()=>{};
var pids = {};
var queue = [];

module.exports = {
	setStream(stream,callback) {
		queueStream = stream;
		onemit = callback || onemit;
	},

	async write(chunk,encoding,callback) {
		let rid = chunk.$$reemit || true;
		chunk.$$reemit = rid;

		// A normal reemit, send entry to the inputs queue stream
		if(rid===true) {
			queueStream.write(chunk,encoding,callback);
			onemit(chunk);
		}
		// A direct reemit. Find who owns the required flow
		else {
			let sent = false;
			do {
				// Get available target processes for the flow
				let targets = Shm.hget('flows',rid);
				//console.log(targets);

				// We have found a target process
				if(targets && targets.length) {
					sent = true;
					let target = targets[Math.floor(Math.random()*targets.length)];

					// We are the process that owns the required flow
					if(target.pid==process.pid) {
						queueStream.write(chunk,encoding,callback);
						onemit(chunk);
					}
					else if(target.blacklist) {
						logger.info(`Target ${target.pid} is blacklisted!`);
					}
					// The flow is on other process
					else {
						// We don't have a connection to the other process
						if(!pids[target.pid]) {
							logger.info(`Opening connection from ${process.pid} => ${target.pid}`);
							let connopts = target.local || target.remote;
							let client = new PubSub.Client();
							let conn  = client.connect(connopts.host,connopts.port);
							pids[target.pid] = {client,conn};

							// Wait for any ack to continue
							client.on('response',code=>{
								callback = queue.shift();
								if(code==PubSub.Code.ERR_REEMIT)
									logger.error(`Remote reemit error from ${target.pid}`);
								callback();
							});

							client.once('error',err=>{
								pids[target.pid].blacklist = true;
								client.on('error',()=>{});
								let pending = client.pending;
								logger.error(`Lost ${pending} entries`,err);
								while((pending--)>=0) {
									callback = queue.shift();
									if(callback) callback();
								}
							});
						}

						// Send entry to the other process
						try {
							let pid = pids[target.pid];
							await pid.conn;
							await pid.client.send({cmd:'reemit',args:[chunk]});
							queue.push(callback);
						}catch(err) {
							logger.error('Error sending entry',err);
							callback();
						}
					}
				}
				// There is no target process. Wait until there is one
				else {
					await new Promise(ok=>setTimeout(ok,100));
				}
			}while(!sent);
		}
	}
}
