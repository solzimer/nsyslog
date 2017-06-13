const
	SWStats = require("swstats"),
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

module.exports = {
	createTimed : createTimed,
	createSized : createSized,
	get : get,
	push : push,
	remove : remove
}
