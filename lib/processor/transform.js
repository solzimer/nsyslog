const
	extend = require("extend"),
	Processor = require("./"),
	logger = require("../logger"),
	Mingo = require('../mingo'),
	jsexpr = require("jsexpr");

/**
 * Transform Processor
 * @class
 * @extends Processor
 * @description <p>Transform processor is the swiss army knife of processors. It leverages
 * the power of MongoDB aggregation framework to transform / filter / aggregate data in
 * every posible way.</p>
 * <p>It uses internally the fabulous Mingo ({@link https://github.com/kofrasa/mingo}) module,
 * an in-memory MongoDB query language implementation.</p>
 */
class TransformProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
	}

	configure(config,callback) {
		this.config = extend(true,{},config);
		this.input = jsexpr.expr(this.config.input || '${originalMessage}');
		this.output = this.config.output? jsexpr.assign(this.config.output) : null;
		this.pipeline = this.config.pipeline || [];
		if(!Array.isArray(this.pipeline))	this.pipeline = [this.pipeline];

		try {
			this.aggr = new Mingo.Aggregator(this.pipeline);
			callback();
		}catch(err) {
			logger.error(err);
			callback(err);
		}
	}

	async process(entry,callback) {
		try {
			let expr = this.input(entry);
			if(!Array.isArray(expr)) expr = [expr];
			let res = this.aggr.run(expr);
			if(res.length>1) {
				let pall = res.map(item=>new Promise(ok=>this.push(item,ok)));
				await Promise.all(pall);
				callback();
			}
			else {
				if(this.output) this.output(entry,res[0]);
				else extend(entry,res);
				callback(null,entry);
			}
		}catch(err) {
			logger.error(err);
			callback(null,entry);
		}
	}
}

if(module.parent) {
	module.exports = TransformProcessor;
}
else {
	let proc = new TransformProcessor('myproc','transform');
	proc.configure({
		input : "${message}",
		pipeline : [
			{
				$addFields : {
					"other" : "key1:val1a, key2:val2a, key3:val3a",
					"length" : {$expr:"${line.length}"},
					"arr" : {
						$arrayToObject : {
							$filter : {
								input : {
									$map : {
										input : {$split : ["$line",","]},
										as : "item",
										in : {
											$split : [{$trim:{input:"$$item"}},":"]
										}
									}
								},
								as : "item",
								cond : {
									$starts : ["$$item.0",'key']
								}
							}
						}
					}
				}
			}
		]
	},()=>{});

	proc.push = (entry,cb)=>{
		console.log(entry);
		cb();
	}

	proc.process({message:{line:"key1:val1, key2:val2, key3:val3"}},()=>{}).then(()=>{
		console.log("FINISH!");
	});
}
