const
	EventEmiter = require('events'),
	logger = require('./logger');

var seq = 0;

/**
 * Component class. Every input, processor and transporter is a
 * component.
 * @class
 * @abstract
 * @extends EventEmmiter
 */
class Component extends EventEmiter {
	/**
	 * Component constructor
	 * @param {string} id Component ID (alias)
	 * @param {string} type Component type
	 */
	constructor(id,type) {
		super();

		/** @property {string} id Component ID */
		this.id = id;

		/** @property {string} type Component type ID */
		this.type = type;

		/** @property {string} own Instance is owned by the current process */
		this.own = false;

		/** @property {array<stream>} streams List of stream instances that uses this component instance */
		this.streams = [];

		/**
		 * @property {object} $def config.json component definition
		 * @property {string} $def.type Component type ID
		 * @property {boolean} $def.disabled Component is disabled
		 * @property {object} $def.when Component data pre-filter
		 * @property {string|object} $def.when.filter Filter expression
		 * @property {Constants.FILTER_ACTION} $def.when.match Action when data matches filter (block, process, bypass)
		 * @property {Constants.FILTER_ACTION} $def.when.nomatch Action when data doesn't match filter (block, process, bypass)
		 * @property {object} $def.then Component data post-filter
		 * @property {string|object} $def.then.filter Filter expression
		 * @property {Constants.FILTER_ACTION} $def.then.match Action when data matches filter (block, process)
		 * @property {Constants.FILTER_ACTION} $def.then.nomatch Action when data doesn't match filter  (block, process)
		 */
		this.$def = {};
	}

	/**
	 * Configures a component. It's the first method that is called in order
	 * to initialize the compoment
	 * @param {object} cfg Configuration options
	 * @param {function} callback Callback function
	 */
	configure(cfg,callback) {
		callback();
	}

	/**
	 * Starts a component
	 * @param {object} cfg Configuration options
	 * @param {function} callback Callback function
	 */
	start(callback) {
		callback();
	}

	/**
	 * Pauses a component. When a component is paused, no data
	 * will be sent, but pending data can be processed
	 * @param {function} callback Callback function
	 */
	pause(callback) {
		callback();
	}

	/**
	 * Resumes a component previously paused. When resumed, component start
	 * receiving more data
	 * @param {function} callback Callback function
	 */
	resume(callback) {
		callback();
	}

	/**
	 * Stops the component. This is a finalization method, meaning the the
	 * component must free all resources in order to stop the engine
	 * @param {function} callback Callback function
	 */
	stop(callback) {
		callback();
	}

	/**
	 * Generates a key for an entry. This key is only descriptive, a way to
	 * show "how" an entry is identified by a component
	 * @param {function} callback Callback function
	 */
	key(entry) {
		if(entry.$key) return entry.$key;
		return `${this.id}@${this.type}`;
	}

	/**
	 * @protected
	 * @return {number}
	 */
	static nextSeq() {
		return seq++;
	}

	/**
	 * @protected
	 * @param  {stream} stream
	 */
	static handlePipe(stream) {
		stream.on('pipe',src=>{
			logger.debug(`${src.instance.id} piped to ${stream.instance.id}`);
			/*
			src.on('data',(entry)=>{
				logger.silly(`Data from ${src.instance.id} to ${stream.instance.id}`);
				stream.emit(Events.transfer,entry,{from:src,to:stream});
			});
			*/
		});
	}
}

module.exports = Component;
