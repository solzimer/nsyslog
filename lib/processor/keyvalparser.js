const
	extend = require("extend"),
	Processor = require("./"),
	logger = require("../logger"),
	jsexpr = require("jsexpr");

/**
 * KeyValParserProcessor class for parsing key-value pairs from strings.
 * @extends Processor
 */
class KeyValParserProcessor extends Processor {
	/**
	 * Creates an instance of KeyValParserProcessor.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {string} [config.input='${originalMessage}'] - The input field containing the key-value string.
	 * @param {string} [config.output=null] - The output field to store the parsed object.
	 * @param {Function} callback - The callback function.
	 */
	configure(config, callback) {
		// Merge default and provided configurations
		this.config = extend({}, config);
		this.output = this.config.output ? jsexpr.assign(this.config.output) : null;
		this.input = jsexpr.expr(this.config.input || "${originalMessage}");

		callback();
	}

	/**
	 * Starts the processor.
	 * @param {Function} callback - The callback function.
	 */
	start(callback) {
		callback();
	}

	/**
	 * Processes a log entry and parses its key-value string.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function.
	 */
	process(entry, callback) {
		// Extract the input message
		let msg = this.input(entry);
		let tokens = [], tlen = 0;
		let res = {};

		// Tokenize the input string
		let p1 = msg.trim().split(" "), p1len = p1.length;
		for (let i = 0; i < p1len; i++) {
			let p2 = p1[i].split("="), p2len = p2.length;
			for (let j = 0; j < p2len; j++) {
				tokens[tlen++] = p2[j];
			}
		}

		// Parse tokens into key-value pairs
		let haskey = false, token = null;
		while (tokens.length) {
			if (!haskey) {
				haskey = true;
				token = tokens.shift();
				res[token] = "";
			} else {
				haskey = false;
				let val = tokens.shift();

				// Handle different value formats
				if (!val.startsWith('"')) {
					res[token] = val; // Simple value without quotes
				} else if (val.startsWith('"') && val.substring(1).indexOf('"') >= 0) {
					res[token] = val.substring(1, val.length - 1).replace(/(".*$)/g, ''); // Simple quoted value
				} else {
					// Handle spaced quoted value
					res[token] += val;
					do {
						val = tokens.shift();
						if (val !== undefined)
							res[token] += " " + val;
					} while (val !== undefined && !val.endsWith('"'));
					res[token] = res[token].substring(1, res[token].length - 1);
				}
			}
		}

		// Assign the parsed object to the output or extend the entry
		if (this.output) {
			this.output(entry, res);
		} else {
			extend(entry, res);
		}

		callback(null, entry);
	}
}

if (module.parent) {
	module.exports = KeyValParserProcessor;
} else {
	// Example usage for testing
	let data = `date=2023-10-04 time=10:26:53 devname="01Histo_Fortigate" devid="FG6H1ETB22900674" eventtime=1696408013521786372 tz="+0200" logid="0000000013" type="traffic" subtype="forward" level="notice" vd="root" srcip=172.16.3.138 srcport=57135 srcintf="vlan_14" srcintfrole="undefined" dstip=57.128.101.78 dstport=80 dstintf="vlan_250" dstintfrole="undefined" srccountry="Reserved" dstinetsvc="AnyDesk-AnyDesk" dstcountry="France" dstregion="Hauts-de-France" dstcity="Roubaix" dstreputation=5 sessionid=2985024649 proto=6 action="deny" policyid=952 policytype="policy" poluuid="6cab4c62-3131-51ee-df54-56ce3fd9a8ea" policyname="Deny Anydesk" user="PILAR.CARRILLO" authserver="AJCASTELLDEFELS" service="AnyDesk-AnyDesk" trandisp="noop" duration=0 sentbyte=0 rcvdbyte=0 sentpkt=0 rcvdpkt=0 appcat="unscanned" crscore=30 craction=131072 crlevel="high"733`;
	let keyval = new KeyValParserProcessor('test', 'keyval');
	keyval.configure({}, () => {});
	keyval.process({ originalMessage: data }, (err, res) => {
		console.log(res);
	});
}
