var queueStream = null;
var onemit = ()=>{};

module.exports = {
	setStream(stream,callback) {
		queueStream = stream;
		onemit = callback || onemit;
	},

	write(chunk,encoding,callback) {
		chunk.$reemit = chunk.$reemit || true;
		queueStream.write(chunk,encoding,callback);
		onemit(chunk);
	}
}
