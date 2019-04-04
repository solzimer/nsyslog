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

		let p1 = msg.split(" "), p1len = p1.length;
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
				else if(val.startsWith('"') && val.endsWith('"')){
					res[token] = val.substring(1,val.length-1);
				}
				// Spaced quoted value
				else {
					res[token] += val;
					do {
						val = tokens.shift();
						res[token] += " " + val;
					}while(!val.endsWith('"'));
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
	let keyval = new KeyValParserProcessor('test','keyval');
	keyval.configure({},()=>{});
	keyval.process({originalMessage:`<189>date=2018-11-24 time=22:52:16 devname="FW-C67-1" devid="FG1K5D3I15803580" logid="0201009233" type="utm" subtype="virus" eventtype="analytics" level="information" vd="root" eventtime=1543096336 msg="File submitted to Sandbox." action="analytics" service="HTTP" sessionid=797348764 srcip=10.67.2.34 dstip=136.243.166.107 srcport=4103 dstport=80 srcintf="PRO_WEB" srcintfrole="undefined" dstintf="C67-FOM" dstintfrole="undefined" policyid=267 proto=6 direction="incoming" filename="versions.dat.gz" url="http://upgrade.bitdefender.com/lightav32_47446/versions.dat.gz" profile="VIRUS_FS" agent="downloader" analyticscksum="6307e7a99e8598412eebf0f3ba392d6df065160c0eb26a35b7d32a7c2fad9c10" analyticssubmit="true"`},()=>{});
}
