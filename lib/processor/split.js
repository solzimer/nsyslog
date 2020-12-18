const
	extend = require("extend"),
	Processor = require("./"),
	logger = require('../logger'),
	jsexpr = require("jsexpr");

const MODE = {
	"array" : "array",
	"item" : "item",
	"map" : "map"
}

class SplitProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
	}

	configure(config,callback) {
		this.config = extend({},config);
		this.input = jsexpr.expr(this.config.input || '${originalMessage}');
		this.output = jsexpr.assign(this.config.output || "splitted");
		this.separator = this.config.separator || " ";
		this.mode = MODE[this.config.mode] || MODE.array;
		this.map = this.config.map || null;
		if(this.map) {
			this.map = this.map.map(f=>jsexpr.assign(f));
		}
		callback();
	}

	start(callback) {
		callback();
	}

	process(entry,callback) {
		let val = this.input(entry);

		if(!Array.isArray(val))
			val = `${val}`.split(this.separator);

		if(this.map || this.mode==MODE.map) {
			let out = {};
			let map = this.map;
			let len = map.length;
			for(let i=0;i<len;i++) {
				this.map[i](out,val[i]);
			}
			this.output(entry,out);
			callback(null,entry);
		}
		else if(this.mode==MODE.array) {
			this.output(entry,val);
			callback(null,entry);
		}
		else if(this.mode==MODE.item) {
			let prall = val.map(item=>{
				return new Promise((ok)=>{
					try {
						let nentry = extend(true, {}, entry);
						this.output(nentry,item);
						this.push(nentry,ok);
					}catch(err) {
						logger.error(`[${this.id}]`,err);
						ok();
					}
				});
			});

			Promise.all(prall).then(()=>callback());
		}
	}
}

module.exports = SplitProcessor;
