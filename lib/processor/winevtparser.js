const
	extend = require("extend"),
	Processor = require("./"),
	xml = require('xml2js').parseString,
	jsexpr = require("jsexpr");

const XML_OPTS = {
	explicitArray:false,
	mergeAttrs:true
};
	
class WinevtParserProcessor extends Processor {
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

	async process(entry,callback) {
		let msg = this.input(entry);
		let json = await new Promise(ok=>xml(msg,XML_OPTS,(err,json)=>err?ok({err}):ok(json)));
		if(json==null) return callback(null);
		
		if(!json.err) {
			let newTs = json.Event.System.TimeCreated.SystemTime;
			json.Event.SystemTime = newTs;
		}
		else {
			return callback(json.err,null);
		}

		// Fix EventID
		if(json.Event.System.EventID._) {
			json.Event.System.Qualifiers = json.Event.System.EventID.Qualifiers;
			json.Event.System.EventID = json.Event.System.EventID._;
		}

		// Remap eventdata for easy processing
		if(json.Event.EventData && json.Event.EventData.Data) {
			let edata = json.Event.EventData.Data;
			if(typeof(edata)=='string') {
				json.Event.EventData.Data = {Message:edata};
			}
			else if(Array.isArray(edata)) {
				json.Event.EventData.Data = edata.reduce((map,item,i)=>{
					if(item.Name)	map[item.Name] = item._;
					else map[i] = item;
					return map;
				},{});
			}
		}
		
		this.output(entry,json);
		return callback(null,entry);
	}
}

module.exports = WinevtParserProcessor;
