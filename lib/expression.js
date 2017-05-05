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

if(!module.parent) {
	var fn = parse("(${host}=='mymachine' || ${host}=='yourmachine') && ${appName}=='su'");
	for(var i=0;i<1000;i++)
		console.log(fn({host:"mymachine",appName:23}));
}
else {
	module.exports = parse;
}
