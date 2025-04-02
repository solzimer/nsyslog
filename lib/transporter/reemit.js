/**
 * ReemitTransporter is a transporter that re-emits log entries to a specified target.
 */
const reemiter = require('../reemiter'),
	extend = require('extend'),
	Transporter = require("./");

class ReemitTransporter extends Transporter {
	/**
	 * Constructs a ReemitTransporter instance.
	 * @param {string} id - The identifier for the transporter.
	 * @param {string} type - The type of the transporter.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the ReemitTransporter with the provided settings.
	 * @param {Object} config - Configuration object.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config, callback) {
		if(this.id.length>1) {
			this.target = this.id.substring(1);
		}
		callback();
	}

	/**
	 * Processes and re-emits log entries to the target.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - Callback function to signal completion.
	 */
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
