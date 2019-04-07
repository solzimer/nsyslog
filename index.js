if(module.parent) {
	module.exports = require("./lib/nsyslog");
	return;
}

const
	program = require("commander"),
	logger = require('./lib/logger'),
	Config = require("./lib/config"),
	Stats = require('./lib/stats'),
	NSyslog = require("./lib/nsyslog");

program.version('0.0.1')
	.option('-f, --file [file]', 'Config file')
	.option('-L, --log-level [level]', 'Debug level')
	.parse(process.argv);

const stats = Stats.fetch('main');
logger.setLevel(program.logLevel || 'info');

async function initialize() {
	try {
		let ti = Date.now();
		let cfg = await Config.read(program.file || "./examples/config/cfg001.json");

		logger.info(`Config loaded!`);
		var nsyslog = new NSyslog(cfg);

		nsyslog.on('stats',other=>{
			stats.merge(other);
		});

		setInterval(()=>{
			logger.info(`${new Date()} : ${JSON.stringify(stats.all())}`);
			/*
			let tf = Date.now();
			if(tf-ti>=30000) {
				console.log(stats.all());
				process.exit(0);
			}
			*/
		},1000);

		await nsyslog.start();

		process.on('SIGTERM', async()=>{
			try {
				await nsyslog.stop();
			}catch(err){
				logger.error(err);
			}
			setTimeout(()=>process.exit(1),500);
		});

		process.on('SIGINT', async()=>{
			try {
				await nsyslog.stop();
			}catch(err){
				logger.error(err);
			}
			setTimeout(()=>process.exit(1),500);
		});

	}catch(err) {
		logger.error(err);
		return;
	}
}

initialize();
