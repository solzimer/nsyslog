
const xml = require('xml2js').parseString;

const FORMAT = {
    xml: 'xml',
    json: 'json'
};

const XML_OPTS = {
	explicitArray: false,
	mergeAttrs: true
};

class EventParser {
    format = FORMAT.xml;

    constructor(format) {
        this.format = format || FORMAT.xml;
    }

    async feed(line) {
        if(this.format!=FORMAT.json) {
            return {Event:line};
        }
        else {
            let json = await new Promise((ok,rej)=>{                    
                xml(line,XML_OPTS,(err,json)=>err?ok({err}):ok(json));
            });

            if(!json) return {err: new Error("Failed to parse XML")};
            if(json.err) return json;

            let newTs = json.Event?.System?.TimeCreated?.SystemTime;
            json.Event.SystemTime = newTs;

            // Fix EventID
            if(json.Event?.System?.EventID?._) {
                json.Event.System.Qualifiers = json.Event?.System?.EventID?.Qualifiers;
                json.Event.System.EventID = json.Event?.System?.EventID?._;
            }

            // Remap eventdata for easy processing
            let edata = json.Event?.EventData?.Data;
            if(typeof(edata)=='string') {
                json.Event.EventData.Data = {Message:edata};
            }
            else if(Array.isArray(edata)){
                json.Event.EventData.Data = edata.reduce((map,item,i)=>{
                    if(item.Name)	map[item.Name] = item._;
                    else map[i] = item;
                    return map;
                }, {});
            }
            return json;
        }
    }
}

module.exports = EventParser;
