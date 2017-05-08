const RX = /\$\{[^\}]+\}/g;

function val(obj,key) {
	var arr = key.split(".");
	arr.forEach(key=>{
		if(obj==null || obj==undefined) return;
		else obj = obj[key];
	});

	return obj || undefined;
}

function parse(expr) {
	var m = expr.match(RX);
	if(m) {
		m.forEach(token=>{
			var key = token.replace(/[\$\{\}]/g,"").trim();
			expr = expr.replace(token,"__val(entry,'"+key+"')");
		});
	}
	var fn = new Function("entry","__val","return ("+expr+")");

	return function(entry) {
		return fn(entry,val);
	}
}

function tokens(expr) {
	var list = [];
	var m = expr.match(RX)||[];
	m.forEach(token=>{
		var idx = expr.indexOf(token);
		var t = expr.substring(0,idx);
		expr = expr.substring(idx+token.length);
		list.push(t);
		list.push(function(entry){
			return val(entry,token.replace(/\$|\{|\}/g,""))
		});
	});
	list.push(expr);

	return function(entry) {
		return list.map(t=>typeof(t)=="string"? t : t(entry)).join("");
	}
}

if(!module.parent) {
	var fn = parse("(${host}=='mymachine' || ${host}=='yourmachine') && ${appName}=='su'");
	var expr = tokens("/var/${date}/${client.address}/file.log");
	console.log(fn({host:"mymachine",appName:23}));
	console.log(expr({date:"2017-01-01",client:{address:"localhost"}}));
}
else {
	module.exports = {
		fn : parse,
		expr : tokens
	}
}
