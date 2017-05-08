function NullTransporter() {}

NullTransporter.prototype.configure = function(config,json) {}

NullTransporter.prototype.send = function(entry,callback) {}

module.exports = NullTransporter;
