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
		} else if (Array.isArray(jsonObj[key])) {
			jsonObj[key].forEach((item, index) => {
				if(typeof (item) == 'object') {
					let flat = flattenJson(item);
					for (let fkey in flat) {
						res[`${key}.${index}.${fkey}`] = flat[fkey];
					}
				}
				else {
					res[`${key}.${index}`] = item;
				}				
			});
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
/*
a = {  "event": {
    "st": "AUDIT",
    "sn": "monica",
    "res": "frontend",
    "subres": "audit.activity",
    "evt": "logout",
    "sip": "192.168.24.1",
    "timestamp": "2025-04-07T09:28:56.199Z",
    "fn": "/security/user/logout",
    "ct1": "SecurityUser",
    "ct2": "OK",
    "ct3": 2,
    "ct4": "",
    "type": "after",
    "dun": "",
    "sev": "1",
    "ei": {
      "audit": {
        "lastChange": 1744018032421,
        "creationTime": 1741792034828,
        "idLong": 2,
        "idCustomer": 1,
        "customerName": "GrupoICA",
        "idParent": 1,
        "fullName": "Marie Curie",
        "email": "marie.curie",
        "name": "marie.curie",
        "active": true,
        "validated": true,
        "usernameValid": null,
        "securityLoginType": "Security",
        "profileList": [
          {
            "lastChange": 1741855579712,
            "creationTime": 1741855549604,
            "idLong": 2,
            "idCustomer": 1,
            "idUser": 1,
            "name": "Operador Incidentes",
            "description": null,
            "securityLoginType": "Security",
            "data": {},
            "sections": [
              "view/license",
              "admin/scheduler",
              "view/security",
              "admin/forensic",
              "admin/tracking",
              "view/tracking",
              "view/audit",
              "view/breakdown",
              "admin/breakdown",
              "view/cep",
              "edit/cep",
              "view/loghost",
              "edit/loghost",
              "view/preferences",
              "admin/achilles",
              "view/achilles",
              "view/arkime",
              "view/cisco",
              "view/ciscoamp",
              "view/cortex",
              "view/cytomic",
              "view/ksc",
              "view/federation",
              "view/fortinet",
              "view/healthmonitor",
              "view/iris",
              "view/itop",
              "view/kela",
              "view/lam",
              "view/siemfeed",
              "view/watcher",
              "view/microclaudia",
              "view/sophos",
              "view/misp",
              "view/nessus",
              "view/nids",
              "view/notification",
              "view/pilar",
              "view/proactivanet",
              "view/rf",
              "view/report",
              "edit/report",
              "view/reyes",
              "view/rtir",
              "view/sc"
            ],
            "sectiontype": "view",
            "editable": true,
            "id": "67d29b3d93deec7da19f09c5"
          },
          {
            "lastChange": 1741865277809,
            "creationTime": 1741865222408,
            "idLong": 3,
            "idCustomer": 1,
            "idUser": 1,
            "name": "Operador Cuadro de Mando",
            "description": null,
            "securityLoginType": "Security",
            "data": {
              "permission_all_queue": true
            },
            "sections": [
              "edit/cep",
              "edit/loghost",
              "view/sc",
              "admin/sc"
            ],
            "sectiontype": "admin",
            "editable": true,
            "id": "67d2c10693deec4b92e4ebf2"
          }
        ],
        "isWaitingToken": false,
        "profileIdList": [
          2,
          3
        ],
        "distinctSections": [
          "view/license",
          "admin/scheduler",
          "view/security",
          "admin/forensic",
          "admin/tracking",
          "view/tracking",
          "view/audit",
          "view/breakdown",
          "admin/breakdown",
          "view/cep",
          "edit/cep",
          "view/loghost",
          "edit/loghost",
          "view/preferences",
          "admin/achilles",
          "view/achilles",
          "view/arkime",
          "view/cisco",
          "view/ciscoamp",
          "view/cortex",
          "view/cytomic",
          "view/ksc",
          "view/federation",
          "view/fortinet",
          "view/healthmonitor",
          "view/iris",
          "view/itop",
          "view/kela",
          "view/lam",
          "view/siemfeed",
          "view/watcher",
          "view/microclaudia",
          "view/sophos",
          "view/misp",
          "view/nessus",
          "view/nids",
          "view/notification",
          "view/pilar",
          "view/proactivanet",
          "view/rf",
          "view/report",
          "edit/report",
          "view/reyes",
          "view/rtir",
          "view/sc",
          "admin/sc"
        ],
        "userRoot": false,
        "editable": true,
        "id": "67d1a32293deec7da19eda52"
      }
    }
  }
};

let res = flattenJson(a.event);
console.log(res);


*/
/*
async function test() {
	const JsonParser = require("./jsonparser");
	const syslogParser = require("nsyslog-parser");
	let obj = {"a":{
			"b": {
				"c": "d",
				"e": "f"
			}
		},
		"g": "h",
		"i": [
			{"j": "k","l": "m"},
			{"n": "o","p": "q"}
		]
	};
	let entry = {
		"originalMessage": obj,
		"cef": ""
	};

	const cefout = new CEFOutProcessor("test", "test");
	const parser = new JsonParser("test", "test");
	await new Promise(ok=>cefout.configure({"input": "${originalMessage}","output": "cef"},ok));
	await new Promise(ok=>parser.configure({"input": "${fields}","output": "json","unpack":true},ok));
	let res1 = await new Promise(ok=>cefout.process(entry, (err,res)=>ok(res)));
	let res2 = syslogParser(res1.cef);
	let res3 = await new Promise(ok=>parser.process(res2, (err,res)=>ok(res)));
	console.dir(res1, {depth: null});
	console.dir(res2, {depth: null});
	console.dir(res3, {depth: null});
}

test().catch(console.error).finally(()=>{
	console.log("done");
});
*/