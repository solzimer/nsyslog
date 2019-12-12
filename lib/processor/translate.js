const
	extend = require("extend"),
	Processor = require("./"),
	fs = require("fs-extra"),
	Path = require('path'),
	jsexpr = require("jsexpr");

const DEF_CONF = {
	map : {},
	file : null,
	fields : []
};

class TranslateProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
	}

	async configure(config,callback) {
		this.config = extend({},DEF_CONF,config);
		this.map = this.config.map;

		// Translation allows expressions
		Object.keys(this.map).forEach(k=>{
			let v = this.map[k];
			if(typeof(v)=='number') return;
			if(typeof(v)=='object' || v.indexOf('${')>=0) {
				this.map[k] = jsexpr.expr(v);
			}
		});

		this.fields = this.config.fields.map(f=>{
			return {
				input : jsexpr.expr(f.input),
				output : jsexpr.assign(f.output)
			};
		});

		if(this.config.file) {
			let path = Path.resolve(this.config.$path,this.config.file);
			let file = await fs.readFile(path,'utf-8');
			try {
				let json = JSON.parse(file);
				extend(this.map,json);
			}catch(err) {
				return callback(err);
			}
		}
		callback();
	}

	start(callback) {
		callback();
	}

	process(entry,callback) {
		let fields = this.fields, flen = fields.length;
		for(let i=0;i<flen;i++) {
			let f = fields[i];
			let val = f.input(entry);
			let trans = this.map[val] || this.map["*"] || val;
			if(typeof(trans)=='function') trans = trans(entry);
			f.output(entry,trans);
		}
		callback(null,entry);
	}
}

module.exports = TranslateProcessor;
