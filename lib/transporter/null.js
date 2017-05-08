function NullTransporter() {}

NullTransporter.prototype.configure = function(config) {}

NullTransporter.prototype.send = function(entry,callback) {}

module.exports = NullTransporter;
