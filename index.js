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
	.parse(process.argv);

const stats = Stats.fetch('main');

async function initialize() {
	try {
		let ti = Date.now();
		let cfg = await Config.read(program.file || "./config/cfg001.json");

		logger.info(`Config loaded!`);
		var nsyslog = new NSyslog(cfg);

		nsyslog.on('ack',(stage,flow,module,entry)=>{
			stats.ack(stage,module);
		});

		nsyslog.on('data',(stage,flow,module,entry)=>{
			stats.emit(stage,module);
		});

		nsyslog.on('error',(stage,flow,module,error)=>{
			stats.fail(stage,module);
			logger.error(error);
		});

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
