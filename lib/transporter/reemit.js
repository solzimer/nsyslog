const
	logger = require('../logger'),
	reemiter = require('../reemiter'),
	extend = require('extend'),
	Transporter = require("./");

class ReemitTransporter extends Transporter {
	constructor(id,type) {
		super(id,type);
  }

	async configure(config, callback) {
		if(this.id.length>1) {
			this.target = this.id.substring(1);
		}
		callback();
	}

	transport(entry, callback) {
		if(this.target) {
			entry = extend({},entry,{"$$reemit" : this.target});
		}

		reemiter.write(entry,null,(err)=>{
			callback(err,entry);
		});
  }
}

module.exports = ReemitTransporter;
