const winston = require("winston");

winston.level = 'info';

instance = winston;

module.exports = {
	setInstance(newInstance) {
		instance = newInstance
	},
	info() {
		instance.info.apply(winston,arguments)
	},
	debug() {
		instance.debug.apply(winston,arguments)
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
