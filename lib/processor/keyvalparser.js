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
	//let data = `action:"Accept"; flags:"149764"; ifdir:"inbound"; ifname:"LAN1.4"; loguid:"{0x5ee6ba3c,0x0,0xe820927f,0xc0000000}"; origin:"10.75.204.241"; time:"1592179260"; version:"1"; __policy_id_tag:"product=VPN-1 & FireWall-1[db_tag={7F5BAF71-1C9F-6240-8EC3-1FCB20EED4F1};mgmt=mngfw02;date=1586162511;policy_name=standard_pro\]"; dst:"10.75.8.101"; inzone:"Internal"; origin_sic_name:"CN=FW-POZOBLANCO,O=mngfw02..9xvz8g"; outzone:"External"; product:"VPN-1 & FireWall-1"; proto:"17"; rule:"77"; rule_uid:"{7D7D774C-2582-4D15-9A26-AE43D8EE3AD7}"; s_port:"63181"; service:"53"; service_id:"domain-udp"; src:"10.75.204.35";`;
	//let data = `<189>date=2018-11-24 time=22:52:16 devname="FW-C67-1" devid="FG1K5D3I15803580" logid="0201009233" type="utm" subtype="virus" eventtype="analytics" level="information" vd="root" eventtime=1543096336 msg="File submitted to Sandbox." action="analytics" service="HTTP" sessionid=797348764 srcip=10.67.2.34 dstip=136.243.166.107 srcport=4103 dstport=80 srcintf="PRO_WEB" srcintfrole="undefined" dstintf="C67-FOM" dstintfrole="undefined" policyid=267 proto=6 direction="incoming" filename="versions.dat.gz" url="http://upgrade.bitdefender.com/lightav32_47446/versions.dat.gz" profile="VIRUS_FS" agent="downloader" analyticscksum="6307e7a99e8598412eebf0f3ba392d6df065160c0eb26a35b7d32a7c2fad9c10" analyticssubmit="true"`;
	let data = `id=firewall  sn=C0EAE483F254  time=\"2020-10-28 12:07:40\"  fw=213.229.174.68  pri=6 c=262144 m=98  msg=\"Connection Opened\" n=4278644  usr=\"nicola.baldinelli\" src=172.16.0.52:52923:X1  dst=172.16.1.24:53:X0  proto=udp/dns  vpnpolicy=\"WAN GroupVPN\"`;
	data = data.replace(/\s+/g,' ');
	let keyval = new KeyValParserProcessor('test','keyval');
	keyval.configure({},()=>{});
	keyval.process({originalMessage:data},(err,res)=>{
		console.log(res);
	});
}
