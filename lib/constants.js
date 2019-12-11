/**
 * Global NSyslog constants
 * @namespace
 */
const Constants = {
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
	},

	/**
	 * Filter actions
	 * @enum {string}
	 */
	FILTER_ACTION : {
		/** If filter matches, data is processed */
		process : 'process',
		/** If filter matches, data is bypassed */
		bypass : 'bypass',
		/** If filter matched, data is blocked (ignored) */
		block : 'block'
	}
};

module.exports = Constants;
