const
	Path = require('path'),
	Processor = require("../"),
	Entry = require("./entry"),
	Window = require("./window"),
	extend = require('extend'),
	logger = require('../../logger'),
	nools = require("nools");

class NoolsProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
		this.i = 0;
	}

	configure(config,callback) {
		let self = this;
		this.config = config;
		this.path = Path.resolve(config.$path, config.path || null);
		Window.Path = Path.resolve(config.$datadir,"nools",`${this.id}_window`);

		this.flow = nools.compile(this.path, {
			define: {Entry, Window},
			scope: {
				logger,
				extend,
				publish(item) {
					self.push(item);
				}
			}
		});

		this.session = this.flow.getSession();
		this.session.setMaxListeners(1000);
		this.session.on("assert", logger.silly.bind(logger));
		this.session.on("modify", logger.silly.bind(logger));
		this.session.on("fire", name=>logger.silly(name));
		this.session.on("error", logger.error.bind(logger));
		this.session.on("retract", (item)=>{
			if(typeof(item.$destroy)=='function') {
				item.$destroy();
			}
			logger.silly(item);
		});

		let _retract = this.session.retract;
		let _modify = this.session.modify;
		extend(this.session,{
			modify(entry) {
				setImmediate(()=>_modify.call(self.session,entry));
			}/*,
			retract(entry) {
				try {
					return _retract.call(self.session,entry);
				}catch(err){
					console.error(err);
				}
			}*/
		});

		callback();
	}

	async process(entry,callback) {
		this.session.assert(new Entry(entry));
		try {
			await this.session.match();
			callback();
		}catch(err) {
			callback(err);
		}
	}
}

module.exports = NoolsProcessor;
