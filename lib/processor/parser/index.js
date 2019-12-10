const
	extend = require("extend"),
	fs = require("fs-extra"),
	Processor = require("../"),
	StateMachine = require("./sm"),
	Path = require("path"),
	jsexpr = require("jsexpr");

const DEF_CONF = {
	path : `${__dirname}/generic.json`,
	multi : false,
	cores : 0,
	input : "${originalMessage}",
	output : "parsed"
}

class ParserProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
	}

	configure(config,callback) {
		this.config = extend({},DEF_CONF,config);
		this.path = Path.resolve(config.$path,config.path);
		this.cores = this.config.cores;
		this.multi = this.config.multi;
		this.map = this.config.map;
		this.singleval = this.config.singleval;
		this.input = jsexpr.expr(this.config.input);
		this.output = jsexpr.assign(this.config.output);
		this.inout = jsexpr.expr("${"+this.config.output+"}");
		this.extend = this.config.extend || false;
		this.deep = this.config.deep || false;
		this.trim = this.config.trim===false? false : true;
		callback();
	}

	async start(callback) {
		let file = await fs.readFile(this.path,'utf-8');
		let ruleset = JSON.parse(file);

		this.sm = new StateMachine(ruleset,this.multi);

		callback();
	}

	process(entry,callback) {
		let msg = this.input(entry) || "";
		let parsed = this.sm.parse(this.trim? msg.trim() : msg);

		if(parsed===null) {
				return callback();
		}

		if(this.map) {
			let map = {};
			parsed.forEach(item=>{
				map[item.name] = map[item.name] || [];
				map[item.name].push(item.value);
			});
			if(this.singleval) {
				Object.keys(map).forEach(key=>{
					map[key] = map[key][0];
				});
			}
			parsed = map;
		}

		// Assign output
		try {
			if(!this.extend) {
				this.output(entry,parsed);
			}
			else {
				let obj = this.inout(entry);
				if(!obj) {
					this.output(entry,parsed);
				}
				else if(this.deep) {
					obj = extend(true,obj,parsed);
					this.output(entry,obj);
				}
				else {
					obj = Object.assign(obj,parsed);
					this.output(entry,obj);
				}
			}
		}catch(err) {
			console.error(err);
		}

		callback(null,entry);
	}
}

module.exports = ParserProcessor;
