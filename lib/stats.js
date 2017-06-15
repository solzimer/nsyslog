debugger;
const
	SWStats = require("swstats"),
	shm = require('./sharedmem.js'),
	TimeStats = SWStats.TimeStats,
	SizeStats = SWStats.SizeStats;


var map = {};

function createTimed(path,time,options) {
	var sw = new TimeStats(time,options);
	map[path] = sw;
	return sw;
}

function createSized(path,size,options) {
	var sw = new SizeStats(size,options);
	map[path] = sw;
	return sw;
}

function get(path) {
	return map[path];
}

function push(path,val) {
	map[path].push(val);
}

function remove(path) {
	map[path].destroy();
	delete map[path];
}

setInterval(()=>{
	var stats = [];
	for(var i in map) stats.push({path:i,stats:map[i].stats});
	shm.set("fstats", stats, 5000);
},1000);

module.exports = {
	createTimed : createTimed,
	createSized : createSized,
	get : get,
	push : push,
	remove : remove
}
