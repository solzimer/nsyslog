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
	/*
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
	};
	*/
	
	let proc = new TransformProcessor('myproc','transform');
	proc.configure({
		input : "${message}",
		output : "data",
		pipeline : [
			{
				"$project" : {
					"map" : {
						"$arrayToObject" : {
							"$map" : {
								"input" : {
									"$map" : {
										"input" : {"$split" : ["$line","; "]},
										"as" : "item",
										"in" : {
											"$split" : [{"$trim":{"input":"$$item"}}, ":"]
										}
									}
								},
								"as" : "item",
								"in" : [
									{"$trim":{"input":"$$item.0","chars":" \""}},
									{"$trim":{"input":"$$item.1","chars":" \""}},
								]
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
	};

	proc.process(
		{
			message:{line:`"action:"Accept"; flags:"149764"; ifdir:"inbound"; ifname:"LAN1.4"; loguid:"{0x5ee6ba3c,0x0,0xe820927f,0xc0000000}"; origin:"10.75.204.241"; time:"1592179260"; version:"1"; __policy_id_tag:"product=VPN-1 & FireWall-1[db_tag={7F5BAF71-1C9F-6240-8EC3-1FCB20EED4F1};mgmt=mngfw02;date=1586162511;policy_name=standard_pro\]"; dst:"10.75.8.101"; inzone:"Internal"; origin_sic_name:"CN=FW-POZOBLANCO,O=mngfw02..9xvz8g"; outzone:"External"; product:"VPN-1 & FireWall-1"; proto:"17"; rule:"77"; rule_uid:"{7D7D774C-2582-4D15-9A26-AE43D8EE3AD7}"; s_port:"63181"; service:"53"; service_id:"domain-udp"; src:"10.75.204.35";"`}
		},(er,res)=>{
			console.log(res);
		}
	);
}
