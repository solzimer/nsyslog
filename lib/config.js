const
	fs = require("fs"),
	expression = require("./expression.js");

function read(path,callback) {
	fs.readFile(path,"utf-8",(err,data)=>{
		var json = {};
		try {
			console.log(data);
			json = JSON.parse(data);
		}catch(err) {
			callback(err,null);
		}

		processFilters(json);
		console.log(json);
	});
}

function defaultRegisters() {

}

function processFilters(json) {
	for(var i in json.filters) {
		var val = json.filters[i];
		json.filters[i] = expression(val);
	}
}

function processTransporters(json) {

}

if(!module.parent) {
	read(__dirname+"/../config/template.json",err=>console.log(err));
}
