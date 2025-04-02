const
	Path = require('path'),
	Transporter = require("./"),
	expression = require("jsexpr"),
	fs = require("fs-extra"),
	mkdirp = require('mkdirp');

const MAX_FILES = 500;

class FilePurge {
	constructor(files) {
		this.ival = null;
		this.trs = 0;
		this.files = files;
	}

	take() {
		this.trs++;
		if(this.ival==null) {
			this.ival = setInterval(()=>{
				let files = this.files;
				let keys = Object.keys(this.files);
				if(keys.length<MAX_FILES) return;
				keys.sort((a,b)=>files[a].last - files[b].last);
				keys.splice(0,MAX_FILES);
				keys.forEach(k=>{
					files[k].fd.end();
					delete files[k];
				});
			},60000);
		}
	}

	leave() {
		this.trs--;
		if(!this.trs && this.ival) {
			clearInterval(this.ival);
			this.ival = null;
		}
	}
}

const DEF_CONF = {
	"format" : "${originalMessage}",
	"path" : "./${client.address}.log"
};
const files = {};
const purge = new FilePurge(files);

/**
 * FileTransporter is a transporter for writing log messages to files.
 * 
 * @extends Transporter
 */
class FileTransporter extends Transporter {
	/**
	 * Creates an instance of FileTransporter.
	 * 
	 * @param {string} id - The unique identifier for the transporter.
	 * @param {string} type - The type of the transporter.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the transporter with the provided settings.
	 * 
	 * @param {Object} config - Configuration object for the transporter.
	 * @param {string} [config.path="./${client.address}.log"] - The file path for the log messages.
	 * @param {string} [config.format="${originalMessage}"] - The format of the log message.
	 * @param {string} [config.$path] - Base path for resolving relative file paths.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	configure(config, callback) {
		config = config || {};

		this.base = config.$path;
		this.path = expression.expr(config.path || DEF_CONF.path);
		this.msg = expression.expr(config.format || DEF_CONF.format);

		callback();
	}

	/**
	 * Starts the transporter by initializing the file purge mechanism.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	start(callback) {
		purge.take();
		callback();
	}

	/**
	 * Stops the transporter by stopping the file purge mechanism.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		purge.leave();
		callback();
	}

	/**
	 * Transports a log entry by writing it to a file.
	 * 
	 * @param {Object} entry - The log entry to be transported.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	transport(entry,callback) {
		var path = Path.resolve(this.base,this.path(entry));

		if(!files[path]) {
			var folder = path.split(/\/|\\/);
			if(folder.length>1) folder.pop();
			folder = folder.join("/");
			mkdirp.sync(folder);

			files[path] = {
				path : path,
				last : Date.now(),
				fd : fs.createWriteStream(path,{flags:'a+'})
			};
		}
		var file = files[path];
		var wdata = this.msg(entry);

		file.fd.write(wdata+"\n",(err,res)=>{
			file.last = Date.now();
			callback(err,entry);
		});
	}
}

module.exports = FileTransporter;
