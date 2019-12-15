const
	Input = require('./'),
	logger = require('../logger'),
	jsexpr = require('jsexpr'),
	mingo = require('mingo'),
	Stats = require('../stats'),
	Readable = require('stream').Readable,
	{FILTER_ACTION} = require('../constants'),
	{timer} = require('../util'),
	MODE = Input.MODE;

const stats = Stats.fetch('main');

function getFilter(def) {
	let filter = def.then.filter;

	if(filter) {
		if(typeof(filter)=='object') {
			let query = new mingo.Query(filter);
			return (entry)=>query.test(entry);
		}
		else if(typeof(filter)=='string') {
			try {
				return jsexpr.eval(filter);
			}catch(err) {
				logger.error(`Invalid expression '${filter}' will be ignored.`,err);
				return false;
			}
		}
		else {
			return ()=>filter;
		}
	}
	else {
		return false;
	}
}

function next(input) {
	return new Promise((ok,rej)=>{
		input.next((err,data)=>{
			if(!err) ok(data);
			else rej(err);
		});
	});
}

/**
 * InputWrapper class
 * @extends Input
 * @description <p>InputWrapper is a special subclass of {@link Input} intended to work
 * within the NSyslog core engine. Since inputs can be either <b>push</b> or <b>pull</b>,
 * InputWrapper unifies both kinds of inputs to a single implementation that manages
 * both situations.</p>
 * <p>But that's not the only thing it does. Its other task is to push read entries to
 * the NSyslog input stream, in order to be processed by the flows.</p>
 * @example
 * const InputWrapper = require('nsyslog').Core.InputWrapper;
 * const {BypassStream, QueueStream} = require('nsyslog').Core.Streams;
 *
 * let pushWrapper = new InputWrapper(myPushInput);
 * let pullWrapper = new InputWrapper(myPullInput);
 * pushWrapper.start(buffer)
 *
 * @param {Input} input Input instance
 */
class InputWrapper extends Input {
	constructor(input) {
		super(input.id,input.type);
		/** @property {Input} input Input instance */
		this.input = input;
		/** @property {Input} instance Input instance (again) */
		this.instance = input;
		/**
		 * @protected
		 * @property {Stream} stream Internal stream (only for pull inputs)
		 */
		this.stream = null;
		/**
		 * @protected
		 * @property {Stream} queueStream Output stream where input will be piped to
		 */
		this.queueStream = null;
	}

	/**
	 * Starts the input
	 * @param  {Duplex}   queueStream Duplex stream to pipe read entries
	 * @param  {Function} callback    Callback function
	 */
	start(queueStream,callback) {
		let input = this.input;
		let def = input.$def;
		let filter = def.disabled? null : getFilter(def);
		let filterMatch = FILTER_ACTION[def.then.match] || FILTER_ACTION.process;
		let filterNoMatch = FILTER_ACTION[def.then.nomatch] || FILTER_ACTION.block;

		if(input.mode==MODE.pull) {
			let stream = new Readable({
				objectMode:true,
				highWaterMark:def.maxPending,
				async read() {
					while(true) {
						try {
							let obj = await next(input);
							if(!obj)
								await timer(100);
							else {
								obj.input = input.id;
								obj.type = input.type;
								obj.$key = input.key(obj);

								if(!filter) {
									return this.push(obj);
								}
								else if(filter && filter(obj)) {
									if(filterMatch!=FILTER_ACTION.block) {
										return this.push(obj);
									}
								}
								else if(filter && !filter(obj)) {
									if(filterNoMatch!=FILTER_ACTION.block) {
										return this.push(obj);
									}
								}
							}
						}catch(err) {
							stats.fail('input',input.id);
							await timer(5000);
						}
					}
				}
			});

			this.stream = stream;
			this.queueStream = queueStream;
			this.stream.instance = input;

			input.start((err)=>{
				if(err) this.emit('stream_error',err);
				stream.on('data',data=>stats.emit('input',input.id));
				stream.pipe(queueStream);
			});
		}
		else {
			this.stream = null;
			this.queueStream = queueStream;

			input.start((err,obj)=>{
				if(err) {
					stats.fail('input',input.id);
				}
				else {
					obj.input = input.id;
					obj.type = input.type;
					obj.$key = input.key(obj);

					if(!filter) {
						stats.emit('input',input.id);
						queueStream.write(obj);
					}
					else if(filter && filter(obj)) {
						if(filterMatch!=FILTER_ACTION.block) {
							stats.emit('input',input.id);
							queueStream.write(obj);
						}
					}
					else if(filter && !filter(obj)) {
						if(filterNoMatch!=FILTER_ACTION.block) {
							stats.emit('input',input.id);
							queueStream.write(obj);
						}
					}
				}
			});
			callback();
		}
	}

	pause(callback) {
		if(this.stream) {
			this.stream.unpipe();
		}
		this.input.pause(callback);
	}

	resume(callback) {
		if(this.stream) {
			this.stream.pipe(this.queueStream);
		}
		this.input.resume(callback);
	}

	async stop(callback) {
		if(this.stream) {
			this.stream.unpipe();
		}
		try {
			await this.input.stop(err=>{
				logger.info(`Input ${this.input.id} stopped`);
				callback(err);
			});
		}catch(err) {
			logger.error(`Input ${this.input.id} abnormal stop`,err);
			callback(err);
		}
	}
}

module.exports = InputWrapper;
