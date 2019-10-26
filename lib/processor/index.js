const Component = require('../component');

/**
 * Abstract Processor class
 * @description Processors receive entries and transform them, parsing, setting or deleting properties. They can filter, group, call external scripts, derivate data, and many more.<br/>
 * Processors operate always in serial mode. That is, when multiple processors are present in a flow, they are chained so one entry must pass through all
 * of them (unless it is filtered) until it is sent to the transporters phase.<br/>
 * A processor can be synchronous or asynchronous. Either way, entries alwais mantain their relative order, and are processed this way.
 * @class
 * @abstract
 * @extends Component
 * @param {string} id Processor alias
 * @param {string} type Processor type id
 */
class Processor extends Component {
	constructor(id,type) {
		super(id,type);
	}

	/**
	 * Process a data entry
	 * @param  {object}   entry Data entry
	 * @param  {Function} callback Callback function. Called when entry has been fully processed
	 */
	process(entry,callback) {
		callback(null,entry);
	}

	/**
	 * Generates new entries from the currently being processed one
	 * @param  {Object}   entry New data entry being generated
	 * @param  {Function} callback This callback is called when the flow accepts the new entry
	 */
	push(entry,callback) {
		callback();
	}
}

module.exports = Processor;
