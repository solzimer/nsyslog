const
	extend = require("extend"),
	Processor = require("./"),
	logger = require("../logger"),
	jsexpr = require("jsexpr");

class KeyValParserProcessor extends Processor {
	constructor(id,type) {
		super(id,type);
	}

	configure(config,callback) {
		this.config = extend({},config);
		this.output = this.config.output? jsexpr.assign(this.config.output) : null;
		this.input = jsexpr.expr(this.config.input || "${originalMessage}");

		callback();
	}

	start(callback) {
		callback();
	}

	process(entry,callback) {
		let msg = this.input(entry);
		let tokens = [], tlen = 0;
		let res = {};

		let p1 = msg.trim().split(" "), p1len = p1.length;
		for(let i=0;i<p1len;i++) {
			let p2 = p1[i].split("="), p2len = p2.length;
			for(let j=0;j<p2len;j++) {
				tokens[tlen++] = p2[j];
			}
		}

		let haskey = false, token = null;
		while(tokens.length) {
			if(!haskey) {
				haskey = true;
				token = tokens.shift();
				res[token] = "";
			}
			else {
				haskey = false;
				let val = tokens.shift();

				// Simple value without quotes
				if(!val.startsWith('"')) {
					res[token] = val;
					haskey = false;
				}
				// Simple Quoted value
				else if(val.startsWith('"') && val.substring(1).indexOf('"')>=0){
					res[token] = val.substring(1,val.length-1).replace(/(".*$)/g,'');
				}
				// Spaced quoted value
				else {
					res[token] += val;
					do {
						val = tokens.shift();
						if(val!==undefined)
							res[token] += " " + val;
					}while(val!==undefined && !val.endsWith('"'));
					res[token] = res[token].substring(1,res[token].length-1);
				}
			}
		}

		if(this.output) {
			this.output(entry,res);
		}
		else {
			extend(entry,res);
		}

		callback(null,entry);
	}
}

if(module.parent) {
	module.exports = KeyValParserProcessor;
}
else {
	let data = `date=2023-10-04 time=10:26:53 devname=\"01Histo_Fortigate\" devid=\"FG6H1ETB22900674\" eventtime=1696408013521786372 tz=\"+0200\" logid=\"0000000013\" type=\"traffic\" subtype=\"forward\" level=\"notice\" vd=\"root\" srcip=172.16.3.138 srcport=57135 srcintf=\"vlan_14\" srcintfrole=\"undefined\" dstip=57.128.101.78 dstport=80 dstintf=\"vlan_250\" dstintfrole=\"undefined\" srccountry=\"Reserved\" dstinetsvc=\"AnyDesk-AnyDesk\" dstcountry=\"France\" dstregion=\"Hauts-de-France\" dstcity=\"Roubaix\" dstreputation=5 sessionid=2985024649 proto=6 action=\"deny\" policyid=952 policytype=\"policy\" poluuid=\"6cab4c62-3131-51ee-df54-56ce3fd9a8ea\" policyname=\"Deny Anydesk\" user=\"PILAR.CARRILLO\" authserver=\"AJCASTELLDEFELS\" service=\"AnyDesk-AnyDesk\" trandisp=\"noop\" duration=0 sentbyte=0 rcvdbyte=0 sentpkt=0 rcvdpkt=0 appcat=\"unscanned\" crscore=30 craction=131072 crlevel=\"high\"733`;
	let keyval = new KeyValParserProcessor('test','keyval');
	keyval.configure({},()=>{});
	keyval.process({originalMessage:data},(err,res)=>{
		console.log(res);
	});
}
