const
	fs = require("fs"),
	expression = require("./expression.js");

const TRANSPORTERS = {}

function read(path,callback) {
	fs.readFile(path,"utf-8",(err,data)=>{
		var json = {};
		try {
			json = JSON.parse(data);
		}catch(err) {
			callback(err,null);
		}

		processFilters(json);
		processTransporters(json);
		console.log(json);
		callback(null,json);
	});
}

function defaultRegisters() {
	TRANSPORTERS["null"] = require("./transporter/null.js");
	TRANSPORTERS["file"] = require("./transporter/file.js");
	TRANSPORTERS["console"] = require("./transporter/console.js");
}

function processFilters(json) {
	for(var i in json.filters) {
		var val = json.filters[i];
		json.filters[i] = expression.fn(val);
	}
}

function processTransporters(json) {
	var jstr = json.transporters || {};
	for(var id in jstr) {
		var trdef = TRANSPORTERS[jstr[id].type] || TRANSPORTERS["null"];
		var tr = new trdef();
		tr.configure(jstr[id].config || {});
		jstr[id] = tr;
	}
}

defaultRegisters();

if(!module.parent) {
	read(__dirname+"/../config/template.json",err=>console.log(err));
}
else {
	module.exports = read;
}
