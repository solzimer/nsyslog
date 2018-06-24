const
	logger = require('../logger'),
	reemiter = require('../reemiter'),
	Transporter = require("./");

class ReemitTransporter extends Transporter {
  constructor(id) {
    super(id);
  }

	async configure(config, callback) {
		callback();
	}

	transport(entry, callback) {
		reemiter.write(entry,null,(err)=>{
			callback(err,entry);
		});
  }
}

module.exports = ReemitTransporter;
