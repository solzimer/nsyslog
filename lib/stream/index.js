const
	AwaitStream = require('./awaitstream'),
	BypassStream = require('./bypasstream'),
	FilterStream = require('./filterstream'),
	QueueStream = require('./queuestream');

/**
 * NSyslog core streams
 * @namespace
 * @description <p>Core Streams represent a set of utility streams used by the NSyslog core engine
 * in order to pipe components from sources to destinations</p>
 * <p>Although they are not meant to of public use, they are made available from the
 * {@link NSyslog.Core} module</p>
 */
const Streams = {
	AwaitStream, BypassStream, FilterStream, QueueStream
};

module.exports = Streams;
