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

initialize();
