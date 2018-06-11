const winston = require("winston");

winston.level = 'debug';

module.exports = {
	info() {
		winston.info.apply(winston,arguments)
	},
	debug() {
		winston.info.debug(winston,arguments)
	},
	log() {
		winston.info.log(winston,arguments)
	},
	error() {
		winston.info.error(winston,arguments)
	},
	warn() {
		winston.info.warn(winston,arguments)
	},
	warning() {
		winston.info.warning(winston,arguments)
	}
};
