var queueStream = null;

module.exports = {
	setStream(stream) {
		queueStream = stream;
	},

	write(chunk,encoding,callback) {
		queueStream.write(chunk,encoding,callback);
	}
}
