const Shm = require('./shm');

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

		queueStream.write(chunk,encoding,callback);
		onemit(chunk);
		/*
		if(rid===true) {
			queueStream.write(chunk,encoding,callback);
			onemit(chunk);
		}
		else {
			if(!flows[rid]) {
				flows[rid] = await Shm.hget('flows',rid);
				console.log(flows[rid]);
			}
		}
		*/
	}
}
