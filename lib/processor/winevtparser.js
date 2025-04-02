const
	extend = require("extend"),
	Processor = require("./"),
	xml = require('xml2js').parseString,
	jsexpr = require("jsexpr");

const XML_OPTS = {
	explicitArray: false,
	mergeAttrs: true
};

/**
 * WinevtParserProcessor class extends Processor to parse Windows Event Log XML messages.
 */
class WinevtParserProcessor extends Processor {
	/**
	 * Constructs a new WinevtParserProcessor instance.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {string} [config.input="${originalMessage}"] - The input expression to extract the XML message.
	 * @param {string} [config.output] - The output field to store the parsed JSON object.
	 * @param {Function} callback - The callback function to be called after configuration.
	 */
	configure(config, callback) {
		this.config = extend({}, config);
		this.output = this.config.output ? jsexpr.assign(this.config.output) : null;
		this.input = jsexpr.expr(this.config.input || "${originalMessage}");
		callback();
	}

	/**
	 * Starts the processor (no-op for this processor).
	 * @param {Function} callback - The callback function to be called after starting.
	 */
	start(callback) {
		callback();
	}

	/**
	 * Processes a log entry by parsing the Windows Event Log XML message.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function to be called after processing.
	 */
	async process(entry, callback) {
		let msg = this.input(entry); // Extract the input XML message
		let json = await new Promise(ok => xml(msg, XML_OPTS, (err, json) => err ? ok({ err }) : ok(json)));
		if (json == null) return callback(null);

		if (!json.err) {
			let newTs = json.Event.System.TimeCreated.SystemTime;
			json.Event.SystemTime = newTs;
		} else {
			return callback(json.err, null);
		}

		// Fix EventID
		if (json.Event.System.EventID._) {
			json.Event.System.Qualifiers = json.Event.System.EventID.Qualifiers;
			json.Event.System.EventID = json.Event.System.EventID._;
		}

		// Remap EventData for easier processing
		if (json.Event.EventData && json.Event.EventData.Data) {
			let edata = json.Event.EventData.Data;
			if (typeof (edata) === 'string') {
				json.Event.EventData.Data = { Message: edata };
			} else if (Array.isArray(edata)) {
				json.Event.EventData.Data = edata.reduce((map, item, i) => {
					if (item.Name) map[item.Name] = item._;
					else map[i] = item;
					return map;
				}, {});
			}
		}

		this.output(entry, json); // Assign the parsed JSON object to the output field
		return callback(null, entry);
	}
}

module.exports = WinevtParserProcessor;
