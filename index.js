const
	program = require("commander"),
	logger = require('./lib/logger'),
	Config = require("./lib/config"),
	NSyslog = require("./lib/nsyslog"),
	StatsDB = require("./lib/stats");

program.version('0.0.1')
	.option('-f, --file [file]', 'Config file')
	.parse(process.argv);

const stats = {
	input : {},
	processor : {},
	transporter : {}
};

function timer(t) {
	return new Promise(ok=>setTimeout(ok,t));
}

async function initialize() {
	try {
		let cfg = await Config.read(program.file || "./config/cfg001.json");

		logger.info(`Config loaded!`);
		var nsyslog = new NSyslog(cfg);

		nsyslog.on('data',(stage,flow,module,entry)=>{
			let id = module.instance.id;
			stats[stage][id] = stats[stage][id] || {id:id, success:0, fail:0};
			stats[stage][id].success++;
		});

		nsyslog.on('error',(stage,flow,module,entry)=>{
			let id = module.instance.id;
			stats[stage][id] = stats[stage][id] || {id:id, success:0, fail:0};
			stats[stage][id].error++;
			logger.error(entry);
		});

		setInterval(()=>{
			logger.info(new Date(),JSON.stringify(stats));
		},1000);

		await nsyslog.start();

		/*
		await timer(10000);
		logger.info("Pausing nsyslog...");
		await nsyslog.pause();
		logger.info("nsyslog paused...");
		await timer(5000);
		logger.info("Resuming nsyslog...");
		await nsyslog.resume();
		logger.info("nsyslog resumed...");
		await timer(5000);
		logger.info("stopping nsyslog...");
		await nsyslog.stop();
		logger.info("nsyslog stopped...");
		*/

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
