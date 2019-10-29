const
	AwaitStream = require('./awaitstream'),
	BypassStream = require('./bypasstream'),
	FilterStream = require('./filterstream'),
	QueueStream = require('./queuestream');

/**
 * NSyslog core streams
 * @namespace
 */
const Streams = {
	AwaitStream, BypassStream, FilterStream, QueueStream
}

module.exports = Streams;
