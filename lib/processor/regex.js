const 
    Processor = require("./"),
    jsexpr = require("jsexpr"),
    extend = require("extend");

const DEF_CONFIG = {
    input : "${originalMessage}",
    output : "",
};

/**
 * RegexProcessor class extends Processor to process log entries using regular expressions.
 */
class RegexProcessor extends Processor {
    /**
     * Constructs a new RegexProcessor instance.
     * @param {string} id - The processor ID.
     * @param {string} type - The processor type.
     */
	constructor(id,type) {
		super(id,type);
	}

    /**
     * Configures the processor with the given configuration.
     * @param {Object} config - The configuration object.
     * @param {string} config.input - The input expression to extract the message (default: "${originalMessage}").
     * @param {string} config.output - The output expression to assign processed fields (optional).
     * @param {string} config.regex - The regular expression to match against the input message.
     * @param {string[]} [config.fields] - An array of field names corresponding to regex capture groups (optional).
     * @param {Function} callback - The callback function to be called after configuration.
     */
	configure(config,callback) {
		this.config = extend(true,{},DEF_CONFIG,config);
		this.input = jsexpr.expr(this.config.input);
        this.output = this.config.output? jsexpr.assign(this.config.output) : null;
        this.regex = new RegExp(this.config.regex);
        this.fields = this.config.fields || [];
		callback();
	}

    /**
     * Processes a log entry using the configured regular expression.
     * @param {Object} entry - The log entry to process.
     * @param {Function} callback - The callback function to be called after processing.
     */
	async process(entry,callback) {
        try {
            let msg = this.input(entry); // Extract the input message from the entry
            let res = this.regex.exec(msg); // Execute the regex on the message
            let obj = {};
            if(res) {
                // Map regex groups to fields
                for(let i=1;i<res.length;i++) {
                    obj[this.fields[i-1]||i-1] = res[i];
                }
                // Assign the extracted fields to the output or extend the entry
                if(this.output) {
                    this.output(entry,obj);
                }
                else {
                    extend(true,entry,obj);
                }
            }
            callback(null,entry); // Call the callback with the processed entry
        }catch(e) {
            callback(e); // Call the callback with the error
        }
	}
}

module.exports = RegexProcessor;

/*
const regexProc = new RegexProcessor("regex","regex");
const entry = {originalMessage: `mar 12 11:30:02 logica5 CROND[1425251]: (logica5) CMDOUT (TypeError: Cannot read properties of undefined (reading 'replace'))`};
const callback = (err,entry) => {
    if(err) console.error(err);
    else console.log(entry);
}
regexProc.configure({
    regex: "([a-z]{3} [0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}) ([a-z0-9]+) ([a-zA-Z0-9]+)\\[([0-9]+)\\]: \\(([a-zA-Z0-9]+)\\) CMDOUT \\((.*)\\)",
    fields: ["date","host","process","pid","user","message"],
    output: "event"
},callback);

regexProc.process(entry,callback);
regexProc.process(entry,callback);
regexProc.process(entry,callback);
regexProc.process(entry,callback);
regexProc.process(entry,callback);
regexProc.process(entry,callback);
regexProc.process(entry,callback);
*/