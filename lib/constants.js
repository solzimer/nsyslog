/**
 * NSyslog Constants
 * @module constants
 * @type {Object}
 */
module.exports = {
	/**
	 * Module Type
	 * @enum {string}
	 */
	MODULE_TYPES : {
		inputs : "inputs",
		processors : "processors",
		transporters : "transporters"
	},

	/**
	 * Data entry stage
	 * @enum {string}
	 */
	PROC_MODE : {
		/** Data enters a component */
		input : "in",
		/** Data is output by a component */
		output : "out",
		/** Data is acked (processed successfully) by a component */
		ack : "ack"
	}
}
