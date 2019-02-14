const
	Processor = require("../"),
	Entry = require("./entry"),
	Window = require("./window"),
	extend = require('extend'),
	logger = require('../../logger'),
	nools = require("nools");

class NoolsProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
	}

	configure(config,callback) {
		let self = this;
		this.config = config;
		this.path = config.path || null;

		this.flow = nools.compile(this.path, {
			define: {Entry, Window},
			scope: {
				logger,	extend,
				emit(entry) {self.push(entry);}
			}
		});

		this.session = this.flow.getSession();
		this.session.on("assert", logger.silly.bind(logger));
		this.session.on("retract", logger.silly.bind(logger));
		this.session.on("modify", logger.silly.bind(logger));
		this.session.on("fire", logger.silly.bind(logger));

		callback();
	}

	process(entry,callback) {
		this.session.assert(new Entry(entry));
		this.session.match((err)=>{
			callback(err);
		});
	}
}

module.exports = NoolsProcessor;
