const
	program = require("commander"),
	Config = require("./lib/config"),
	NSyslog = require("./lib/nsyslog"),
	StatsDB = require("./lib/stats");

async function initialize() {
	try {
		let cfg = await Config.read("./config/cfg001.json");

		console.log(cfg);
		var master = new NSyslog(cfg);
		master.start();

	}catch(err) {
		console.error(err);
		return;
	}
}

function strok(msg,instance,flow){
	tstats.forEach(s=>{
		var path = `${s.path}/${flow.id}/${instance.id}`;
		StatsDB.push(path,1);
	});
}

function strerr(msg,instance,flow){
	console.error("ERR");
}

function handle(str){
	if(str.flow && str.instance) {
		tstats.forEach(s=>{
			var path = `${s.path}/${str.flow.id}/${str.instance.id}`;
			StatsDB.createTimed(path,s.time,s.options);
		});
		return str.on("strerr",strerr).on("strok",strok);
	}
	else return str;
}

initialize();