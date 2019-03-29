const winston = require("winston");

winston.level = 'debug';

instance = winston;

module.exports = {
	setInstance(newInstance) {
		instance = newInstance
	},
	setLevel(level) {
		instance.level = level;
	},
	info() {
		instance.info.apply(winston,arguments)
	},
	debug() {
		instance.debug.apply(winston,arguments)
	},
	trace() {
		instance.silly.apply(winston,arguments)
	},
	silly() {
		instance.silly.apply(winston,arguments)
	},
	log() {
		instance.log.apply(winston,arguments)
	},
	error() {
		instance.error.apply(winston,arguments)
	},
	warn() {
		instance.warn.apply(winston,arguments)
	},
	warning() {
		instance.warn.apply(winston,arguments)
	}
};
