const
	Processor = require("../"),
	Path = require('path'),
	logger = require("../../logger"),
	ModuleBolt = require('./modulebolt'),
	ShellBolt = require('./shellbolt'),
	jsexpr = require('jsexpr'),
	extend = require('extend');

const TRX = /[^a-zA-Z0-9]/g;
const WIRE = {
	shuffle: "shuffle",
	group: "group"
};

const DEF_CONF = {
	cores: 1,
	tuple: "${originalMessage}",
	wire: "shuffle",
	field: "_${seq}_"
};

const LOG_LEVEL = {
	0: "trace",
	1: "debug",
	2: "info",
	3: "warn",
	4: "error",
	trace: "trace",
	debug: "debug",
	info: "info",
	warn: "warn",
	error: "error"
};

function vfn() {}

function hash(str) {
    str += "";
    var res = 0, len = str.length;
    for (var i = 0; i < len; i++) {
        res = res * 31 + str.charCodeAt(i);
        res = res & res;
    }
    return Math.abs(res);
}

/**
 * MultilangProcessor class extends Processor to handle multi-language processing
 * using the Apache Storm Multilang protocol. It supports both module-based and
 * shell-based workers for distributed processing.
 */
class MultilangProcessor extends Processor {
	/**
	 * Constructs a new MultilangProcessor instance.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
		this.tid = 0; // Task ID counter
		this.prmap = new Map(); // Map to track processing tasks
		this.workers = []; // Array of worker configurations
		this.procs = []; // Array of worker processes
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} cfg - The configuration object.
	 * @param {string} [cfg.input="${originalMessage}"] - The input expression to extract the tuple.
	 * @param {string} [cfg.output="out"] - The output field to store the processed tuple.
	 * @param {string} [cfg.wire="shuffle"] - The wiring strategy ("shuffle" or "group").
	 * @param {string} [cfg.field="${input}"] - The field used for grouping (if wire is "group").
	 * @param {number} [cfg.cores=1] - The number of worker cores to use.
	 * @param {string} [cfg.module] - Path to the module to execute.
	 * @param {Object} [cfg.options] - Additional options for the workers.
	 * @param {Function} callback - The callback function to be called after configuration.
	 */
	async configure(cfg, callback) {
		this.cfg = extend(true, {}, DEF_CONF, cfg);
		this.tupleget = jsexpr.fn(this.cfg.input || '${originalMessage}');
		this.tupleput = jsexpr.assign(this.cfg.output || "out");
		this.wire = WIRE[this.cfg.wire] || WIRE.shuffle;
		this.field = jsexpr.expr(this.cfg.field || "${input}");

		// Initialize worker configurations
		for (let i = 0; i < this.cfg.cores; i++) {
			this.workers.push({
				idx: i,
				path: this.cfg.module ? Path.resolve(cfg.$path, this.cfg.path) : this.cfg.path,
				module: this.cfg.module || false,
				taskId: this.cfg.path.replace(TRX, "_"),
				config: extend(true, {}, this.cfg.options)
			});
		}
		callback();
	}

	/**
	 * Generates a handshake message for a worker.
	 * @param {Object} worker - The worker configuration.
	 * @returns {Object} The handshake message.
	 */
	getHandshake(worker) {
		let conf = extend({}, { "WORKER.id": worker.taskId }, worker.config);

		return {
			"conf": conf,
			"pidDir": `/tmp`,
			"context": {
				"taskId": worker.taskId
			}
		};
	}

	/**
	 * Starts the processor and initializes worker processes.
	 * @param {Function} callback - The callback function to be called after starting.
	 */
	async start(callback) {
		this.active = true;
		let workers = this.workers;

		// Create worker processes
		this.procs = workers.map(worker => {
			return worker.module ? new ModuleBolt(worker) : new ShellBolt(worker);
		});

		try {
			// Start all worker processes and wait for them to be ready
			let all = this.procs.map(proc => {
				proc.on('log', msg => {
					let level = LOG_LEVEL[msg.level] || "info";
					logger[level](`${this.id}: [${proc.worker.taskId}]`, msg.msg);
				});
				proc.start();
				proc.send(this.getHandshake(proc.worker));
				return proc.ready;
			});
			await Promise.all(all);
		} catch (err) {
			return callback(err);
		}

		// Attach event handlers to each worker process
		this.procs.forEach(this.handle.bind(this));
		callback();
	}

	/**
	 * Handles events from a worker process.
	 * @param {Object} proc - The worker process.
	 */
	handle(proc) {
		proc.on('emit', msg => {
			logger.silly(`${this.id}: Emit tuple on`, msg.anchors);
			msg.anchors = msg.anchors || [];
			let anchor = msg.anchors[0];
			let hasAnchor = this.prmap.has(anchor);
			let entry = extend(
				{ id: this.id },
				hasAnchor ? (this.prmap.get(anchor).entry || {}) : {}
			);
			this.tupleput(entry, msg.tuple);
			if (anchor && hasAnchor)
				this.prmap.get(anchor).emit.push(entry);
			else
				this.push(entry, vfn);

			proc.send([process.pid]);
		});

		proc.on('ack', msg => {
			logger.silly(`${this.id}: Ack tuple on`, msg.id);
			let pr = this.prmap.get(msg.id);
			this.prmap.delete(msg.id);
			pr.callback(null, pr.emit.length ? pr.emit : null);
		});

		proc.on('fail', msg => {
			let pr = this.prmap.get(msg.id);
			this.prmap.delete(msg.id);
			pr.callback(msg);
		});

		proc.on("pid", msg => {
			logger.info(`${this.id}: Started ${proc.worker.taskId} (PID: ${msg.pid})`);
		});

		proc.on("error", (err, msg) => {
			logger.error(err);
			let pr = this.prmap.get(msg.id);
			if (pr) {
				this.prmap.delete(msg.id);
				pr.callback(msg);
			}
		});

		proc.on("close", code => {
			logger.info(`Closed with code ${code}`);
			proc.stop(true);

			if (code != 0) {
				this.prmap.forEach(pr => {
					if (proc.worker.idx == pr.idx) {
						this.prmap.delete(pr.id);
						pr.callback(`Process has died with code ${code}`);
					}
				});

				// Restart the process after a delay
				setTimeout(() => {
					if (!this.active) return;
					logger.info(`Restarting process ${proc.worker.taskId}`);
					proc.start();
					proc.send(this.getHandshake(proc.worker));
				}, 1000);
			}
		});
	}

	/**
	 * Stops the processor and terminates all worker processes.
	 * @param {Function} callback - The callback function to be called after stopping.
	 */
	stop(callback) {
		this.active = false;

		// Stop all worker processes
		this.procs.forEach(proc => {
			proc.removeAllListeners();
			proc.stop();
		});

		// Clear pending tasks
		this.prmap.forEach(pr => {
			pr.callback();
		});

		this.prmap = {};
		this.procs = [];

		if (callback) callback();
	}

	/**
	 * Processes a log entry by sending it to a worker process.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function to be called after processing.
	 */
	async process(entry, callback) {
		if (!this.active) return;

		let tuple = this.tupleget(entry);
		let id = ++this.tid;

		if (!Array.isArray(tuple)) tuple = [tuple];
		let idx = 0;
		switch (this.wire) {
			case WIRE.group:
				idx = hash(this.field(entry)) % this.procs.length;
				break;
			case WIRE.shuffle:
			default:
				idx = Math.floor(Math.random() * this.procs.length);
				break;
		}

		let pr = { id, callback, entry, idx, emit: [] };
		let proc = this.procs[idx];
		try {
			await proc.ready;
			this.prmap.set(id, pr);
			proc.process(id, tuple);
		} catch (err) {
			callback(err);
		}
	}
}

module.exports = MultilangProcessor;
