const
	logger = require('./logger'),
	Shm = require('./shm'),
	PubSub = require('./pubsub');

var queueStream = null;
var onemit = ()=>{};
var flows = {};

module.exports = {
	setStream(stream,callback) {
		queueStream = stream;
		onemit = callback || onemit;
	},

	async write(chunk,encoding,callback) {
		let rid = chunk.$$reemit || true;
		chunk.$reemit = rid

		if(rid===true) {
			queueStream.write(chunk,encoding,callback);
			onemit(chunk);
		}
		else {
			if(!flows[rid]) {
				flows[rid] = await Shm.hget('flows',rid);
				logger.info(`Direct reemit (${rid}) available targets`,flows[rid]);
			}

			let targets = flows[rid];
			if(targets && targets.length) {
				let target = targets[Math.floor(Math.random()*targets.length)];
				if(!target.conn) {
					logger.info(`Direct reemit (${rid}) connecting to target`,target);
					let connopts = target.local || target.remote;
					let client = new PubSub.Client();
					let conn  = client.connect(connopts.host,connopts.port);
					target.client = client;
					target.conn = conn;
				}
				try {
					await target.conn;
					await target.client.send(chunk);
					callback();
				}catch(err) {
					callback(err);
				}
			}
		}
	}
}
