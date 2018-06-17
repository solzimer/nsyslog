const winston = require("winston");

winston.level = 'debug';

module.exports = {
	info() {
		winston.info.apply(winston,arguments)
	},
	debug() {
		winston.debug.apply(winston,arguments)
	},
	log() {
		winston.log.apply(winston,arguments)
	},
	error() {
		winston.error.apply(winston,arguments)
	},
	warn() {
		winston.warn.apply(winston,arguments)
	},
	warning() {
		winston.warn.apply(winston,arguments)
	}
};
