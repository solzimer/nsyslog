const
	logger = require('../logger'),
	{exec, spawn} = require('child_process'),
	Input = require('./');

const MODE = {
	exec : 'exec',
	spawn : 'spawn'
}

class CommandInput extends Input {
	constructor(id,type) {
		super(id,type);
	}

	get mode() {
		return (this.ival || this.cmode==MODE.spawn)? Input.MODE.push : Input.MODE.pull;
	}

	/**
	 * Configures the CommandInput with the provided settings.
	 * @param {Object} config - Configuration object.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config,callback) {
		config = config || {};

		this.cmd = config.cmd;
		this.cmode = config.mode || MODE.exec;
		this.options = config.options;
		this.args = config.args || null;
		this.ival = parseInt(config.interval) || null;

		callback();
	}

	/**
	 * Executes the command and fetches the result.
	 * @returns {Promise<Object>} Resolves with the command result.
	 */
	fetch() {
		return new Promise((ok,rej)=>{
			exec(this.cmd,this.options,(err,res)=>{
				if(err){
					rej(err);
				}
				else {
					ok({
						cmd : this.cmd,
						originalMessage : res
					});
				}
			});
		});
	}

	/**
	 * Starts the CommandInput and begins executing the command.
	 * @param {Function} callback - Callback function to process command output.
	 */
	start(callback) {
		let buffer = '';

		if(this.ival) {
			this.timer = setInterval(async ()=>{
				try {
					let res = await this.fetch();
					callback(null,res);
				}catch(err) {
					callback(err);
				}
			},this.ival);
		}
		else if(this.cmode==MODE.spawn) {
			this.child = spawn(this.cmd,this.args,this.options);
			this.child.stdout.on('data',data=>{
				buffer += data.toString();
				let lines = buffer.split('\n');
				for(let i=0; i<lines.length-1; i++) {
					callback(null,{
						cmd : this.cmd,
						stream: 'stdout',
						originalMessage : lines[i]
					});
				}
				buffer = lines[lines.length-1];
			});
			this.child.stderr.on('data',data=>{
				callback(null,{
					cmd : this.cmd,
					stream: 'stderr',
					originalMessage : data.toString()
				});
			});
			this.child.on('exit',code=>{
				callback(null,{
					cmd : this.cmd,
					stream: 'exit',
					originalMessage : code
				});
			});
		}
		else {
			callback();
		}
	}

	/**
	 * Retrieves the next command output.
	 * @param {Function} callback - Callback function to process the next output.
	 */
	async next(callback) {
		try {
			let res = await this.fetch();
			callback(null,res);
		}catch(err) {
			logger.error(err);
			callback(err);
		}
	}

	/**
	 * Stops the CommandInput and performs cleanup.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		if(this.timer) {
			clearInterval(this.timer);
		}
		callback();
	}

	/**
	 * Pauses the CommandInput by halting command execution.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		this.stop(callback);
	}

	/**
	 * Resumes the CommandInput by restarting command execution.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		this.start(callback);
	}

	key(entry) {
		return `${entry.input}:${entry.type}@${entry.cmd}`;
	}
}

module.exports = CommandInput;
