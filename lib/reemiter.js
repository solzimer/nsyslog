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

		if(rid===true) {
			queueStream.write(chunk,encoding,callback);
			onemit(chunk);
		}
		else {
			let sent = false;
			do {
				let targets = Shm.hget('flows',rid);
				if(targets && targets.length) {
					sent = true;
					let target = targets[Math.floor(Math.random()*targets.length)];
					if(!pids[target.pid]) {
						let connopts = target.local || target.remote;
						let client = new PubSub.Client();
						let conn  = client.connect(connopts.host,connopts.port);
						pids[target.pid] = {client,conn};
						client.on('response',code=>{
							callback = queue.shift();
							callback();
						});
					}
					try {
						let pid = pids[target.pid];
						await pid.conn;
						await pid.client.send({cmd:'reemit',args:[chunk]});
						queue.push(callback);
					}catch(err) {
						logger.error(err);
						return callback(err);
					}
				}
				else {
					await new Promise(ok=>setTimeout(ok,100));
				}
			}while(!sent);
		}
	}
}
