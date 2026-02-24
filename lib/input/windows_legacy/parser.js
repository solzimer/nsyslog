const xml = require('xml2js').parseString;
const {FORMAT} = require('./constants');

const XML_OPTS = {
	explicitArray: false,
	mergeAttrs: true
};

class EventParser {
    #buffer = "";
    format = FORMAT.xml;

    constructor(format) {
        this.format = format || FORMAT.xml;
    }

    async feed(data, callback) {
        this.#buffer += `${data}`;
        this.#buffer = this.#buffer.trim().replace(/\r/g,'');

        let lines = this.#buffer.split("</Event>");
        let last = lines[lines.length-1].trim();
        if(!last.endsWith('</EventData>')) {
            this.#buffer = lines.pop();
        }
        else {
            this.#buffer = "";
        }

        lines = lines.map(l=>`${l}</Event>`);

        if(this.format!=FORMAT.json) {
            let llen = lines.length;
            for(let i=0;i<llen;i++) {
                callback({Event:lines[i]});
            }
        }
        else {
            let jslines = await Promise.all(
                lines.map(l=>new Promise((ok,rej)=>{                    
                    xml(l,XML_OPTS,(err,json)=>err?ok({err}):ok(json));
                }))
            );

            jslines.filter(j=>j!=null).forEach(json=>{
                if(!json.err) {
                    let newTs = json.Event?.System?.TimeCreated?.SystemTime;
                    json.Event.SystemTime = newTs;
                }

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
                callback(json);
            });
        }
    }
}

module.exports = EventParser;