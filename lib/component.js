const
	EventEmiter = require('events'),
	logger = require('./logger');

var seq = 0;

/**
 * @enum {string} Component event types
 */
const Events = {
	ack : 'stream_ack',
	error : 'stream_error',
	data : 'stream_data',
	transfer : 'stream_transfer'
}

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
		this.id = id;
		this.type = type;
		this.own = false;
		this.streams = [];
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
			logger.info(`${src.instance.id} piped to ${stream.instance.id}`);
			/*
			src.on('data',(entry)=>{
				logger.silly(`Data from ${src.instance.id} to ${stream.instance.id}`);
				stream.emit(Events.transfer,entry,{from:src,to:stream});
			});
			*/
		});
	}
}

Component.Events = Events;

module.exports = Component;
