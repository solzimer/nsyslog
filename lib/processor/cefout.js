const extend = require("extend");
const Processor = require(".");
const jsexpr = require("jsexpr");

const DEFAULT_CEF_HEADERS = {
	"CEFVersion": "0",
	"DeviceVendor": "localdomain",
	"DeviceProduct": "localdomain",
	"DeviceVersion": "0",
	"SignatureID": "0",
	"Name": "localdomain",
	"Severity": "0",
	"Extension": ""
};

/**
 * Recursively flattens a JSON object.
 * @param {Object} jsonObj - The JSON object to flatten.
 * @returns {Object} - The flattened JSON object.
 */
function flattenJson(jsonObj) {
	let res = {};
	for (let key in jsonObj) {
		if (typeof (jsonObj[key]) == 'object' && !Array.isArray(jsonObj[key])) {
			let flat = flattenJson(jsonObj[key]);
			for (let fkey in flat) {
				res[key + '.' + fkey] = flat[fkey];
			}
		} else {
			res[key] = jsonObj[key];
		}
	}
	return res;
}

/**
 * Converts a JSON object to a CEF formatted string.
 * @param {Object} jsonObj - The JSON object to convert.
 * @param {Object} [headers={}] - The headers for the CEF message.
 * @returns {string} - The CEF formatted string.
 */
function jsonToCef(jsonObj, headers = {}) {
	const version = headers.CEFVersion || DEFAULT_CEF_HEADERS.CEFVersion;
	const deviceVendor = headers.DeviceVendor || DEFAULT_CEF_HEADERS.DeviceVendor;
	const deviceProduct = headers.DeviceProduct || DEFAULT_CEF_HEADERS.DeviceProduct;
	const deviceVersion = headers.DeviceVersion || DEFAULT_CEF_HEADERS.DeviceVersion;
	const signatureId = headers.SignatureID || DEFAULT_CEF_HEADERS.SignatureID;
	const name = headers.Name || DEFAULT_CEF_HEADERS.Name;
	const severity = headers.Severity || DEFAULT_CEF_HEADERS.Severity;

	let cefHeader = `CEF:${version}|${deviceVendor}|${deviceProduct}|${deviceVersion}|${signatureId}|${name}|${severity}|`;

	let flatJson = flattenJson(jsonObj);
	let cefExtension = '';

	for (const [key, value] of Object.entries(flatJson)) {
		if (!['DeviceVendor', 'DeviceProduct', 'DeviceVersion', 'SignatureID', 'Name', 'Severity'].includes(key)) {
			let val = `${value}`.trim();
			if(val === '') {
				continue;
			}
			cefExtension += `${key}=${val} `;
		}
	}

	return cefHeader + cefExtension.trim();
}

/**
 * CEFOutProcessor class for processing entries into CEF format.
 * @extends Processor
 */
class CEFOutProcessor extends Processor {
	/**
	 * Creates an instance of CEFOutProcessor.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
		this.seq = 0;
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {string} [config.input='${originalMessage}'] - The input field containing data to convert to CEF.
	 * @param {string} [config.output='cef'] - The output field to store the CEF string.
	 * @param {Object} [config.headers={}] - Custom headers for the CEF message.
	 * @param {Function} callback - The callback function.
	 */
	configure(config, callback) {
		this.config = extend(true, {}, config);
		this.output = jsexpr.assign(this.config.output || "cef");
		this.input = jsexpr.expr(this.config.input || "${originalMessage}");
		this.headers = jsexpr.expr(extend(true, {}, DEFAULT_CEF_HEADERS, this.config.headers));

		callback();
	}

	/**
	 * Processes an entry and converts it to CEF format.
	 * @param {Object} entry - The entry to process.
	 * @param {Function} callback - The callback function.
	 */
	process(entry, callback) {
		let json = this.input(entry);
		let headers = this.headers(entry);
		let cef = jsonToCef(json, headers);
		this.output(entry, cef);
		callback(null, entry);
	}
}

module.exports = CEFOutProcessor;
