const Component = require('../component');

/**
 * Abstract Transporter class
 * @description Transporters are meant to write entries to destination endpoints,
 * such as files, syslog, database, etc..<br/>
 * Since a flow can have more than one transporter, and, since they involve
 * asynchronous I/O, you can send entries to these transporters in serial or parallel mode.<br/>
 * As seen in the processors section, again, entries are written to the transporters always
 * preserving the order.
 * @class
 * @abstract
 * @extends Component
 * @param {string} id Transporter alias
 * @param {string} type Transporter type id
 */
class Transporter extends Component {
	constructor(id,type) {
		super(id,type);
	}

	/**
	 * Sends a data entry to its destination endpoint. The entry should
	 * not be modified unless strictly necessary.
	 * @param  {object}   entry Entry to be transported
	 * @param  {Function} callback Callback function to be called after data entry has been sent
	 */
	transport(entry, callback) {
		if(callback) callback(null,entry);
	}
}

module.exports = Transporter;
