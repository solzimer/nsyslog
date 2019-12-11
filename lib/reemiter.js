const
	logger = require('./logger'),
	Shm = require('./shm'),
	PubSub = require('./pubsub'),
	{timer} = require('./util');

var nsyslog = null;
var onemit = ()=>{};
var pids = {};
var queue = [];

/**
 * Reemiter allows a data entry to be redirected to the input stream, in order
 * to be sent again to the flows. A reemit can be generic (send it to the global input stream),
 * or direct (to a concrete flow)
 * @namespace
 */
const Reemiter = {
	/**
	 * Configures the reemiter singleton
	 * @param  {NSyslog}   instance NSyslog instance
	 * @param  {Function} callback Callback function
	 * @return {void}
	 */
	configure(instance,callback) {
		nsyslog = instance;
		onemit = callback || onemit;
	},

	/**
	 * Writes an entry to the reemiter stream
	 * @param {object} chunk Entry to be written
	 * @param {boolean|string} chunk.$$reemit if {true} or {null}, generic reemit. Otherwise, the ID of the flow to send the entry
	 * @param {string} encoding Encoding if entry is string
	 * @param {Function} callback Callback function
	 */
	async write(chunk,encoding,callback) {
		let rid = chunk.$$reemit || true;
		chunk.$$reemit = rid;

		// A normal reemit, send entry to the inputs queue stream
		if(rid===true) {
			nsyslog.push(chunk,callback);
			onemit(chunk);
		}
		// A direct reemit. Find who owns the required flow
		else {
			let sent = false;
			do {
				// Get available target processes for the flow
				let targets = Shm.hget('flows',rid);
				logger.silly('Reemit targets',process.pid,'=>',targets);

				// We have found a target process
				if(targets && targets.length) {
					sent = true;
					let target = targets.find(t=>t.pid==process.pid) || targets[Math.floor(Math.random()*targets.length)];
					logger.silly('Reemit chosen target',process.pid,'=>',target.pid);

					// We are the process that owns the required flow
					if(target.pid==process.pid) {
						nsyslog.push(chunk,rid,callback);
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
							queue.push(callback);
							let pid = pids[target.pid];
							await pid.conn;
							await pid.client.send({cmd:'reemit',args:[chunk]});
						}catch(err) {
							callback = queue.shift();
							logger.error('Error sending entry',err);
							callback();
						}
					}
				}
				// There is no target process. Wait until there is one
				else {
					await timer(100);
				}
			}while(!sent);
		}
	}
}

module.exports = Reemiter;
