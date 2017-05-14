function Server() {
	this.configure = function(config) {}
	this.start = function(callback) {callback();}
	this.stop = function(callback) {callback();}
}

module.exports = Server;
