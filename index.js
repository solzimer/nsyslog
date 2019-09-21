if(module.parent && !global.$$BIN_MODE) {
	module.exports = require("./lib/nsyslog");
}
else {
	require('./bin/nsyslog');
}
