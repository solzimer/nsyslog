const
	Input = require('..'),
    extend = require('extend'),
    Reader = require('./reader');

/**
 * WindowsInput class for reading Windows Event Logs.
 * Extends the base Input class.
 */
class WindowsInput extends Input {
	/** @type {Reader[]} */
	readers = [];
	seq = 0;

	/**
	 * Constructor for WindowsInput.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the WindowsInput with the provided settings.
	 * 
	 * @param {Object} config - Configuration object containing:
	 * @param {string} [config.channel="Application"] - Event log channel to read from.
	 * @param {string} [config.readmode="offset"] - Read mode (offset or watermark).
	 * @param {string|number} [config.offset] - Offset for reading events.
	 * @param {number} [config.batchsize=1000] - Number of events to fetch in each batch.
	 * @param {boolean} [config.remote=false] - Whether to read from a remote machine.
	 * @param {string} [config.username] - Username for remote access.
	 * @param {string} [config.password] - Password for remote access.
	 * @param {string} [config.query] - Query to filter events.
	 * @param {boolean} [config.extended=false] - Whether to fetch extended event data.
	 * @param {string} [config.format="json"] - Format of the output (json or xml).
	 * @param {number} [config.interval=500] - Interval in milliseconds between fetches.
	 * @param {Array<number>} [config.idfilter] - Array of event IDs to filter.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config, callback) {
		config = config || {};

		this.idfilter = config.idfilter || null;
        this.readers = [];
        if(!this.idfilter) {
            this.readers.push(new Reader(this.id, this.type));
            await this.readers[0].configure(config,callback);
        }
        else {
            // Split idfilter into chunks of 10
            let chunks = [];
            for(let i=0;i<this.idfilter.length;i+=10) {
                chunks.push(this.idfilter.slice(i,i+10));
            }
            try {
                await Promise.all(chunks.map(async(ids,i)=>{
                    let iconf = extend(true,{},config);
					iconf.idfilter = ids;
                    this.readers.push(new Reader(`${this.id}-${i}`,this.type));
                    await new Promise((ok,rej)=>{
                        this.readers[i].configure(iconf,(err)=>err?rej(err):ok());
                    });
                }));
                callback();
            }catch(err) {
                callback(err);
            }
        }
	}

	/**
	 * Returns the mode of the input.
	 * @returns {string} The mode of the input (pull).
	 */
	get mode() {
		return Input.MODE.pull;
	}

	async all(action, callback) {
		try {
			await Promise.all(this.readers.map(r=>{
				return new Promise((ok,rej)=>{
					r[action]((err)=>err?rej(err):ok());
				});
			}));

			callback();
		}catch(err) {
			callback(err);
		}
	}

	/**
	 * Retrieves the next event from the queue.
	 * 
	 * @param {Function} callback - Callback function to process the next event.
	 */
	async next(callback) {
        const reader = this.readers[this.seq];
		this.seq = (this.seq+1)%this.readers.length;
		return reader.next(callback);
	}

	/**
	 * Starts the WindowsInput and begins reading events.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async start(callback) {
		await this.all('start',callback);
	}

	/**
	 * Stops the WindowsInput and performs cleanup.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async stop(callback) {
		await this.all('stop',callback);}

	/**
	 * Pauses the WindowsInput, saving the current watermark state.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async pause(callback) {
		await this.all('pause',callback);
	}

	/**
	 * Resumes the WindowsInput.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async resume(callback) {
		await this.all('resume',callback);
	}
}

module.exports = WindowsInput;
