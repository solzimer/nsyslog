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
	.option('-t, --test', 'Only validate config file')
	.option('-L, --log-level [level]', 'Debug level')
	.option('--cli', 'Starts CLI session')
	.option('--cli-start', 'Starts CLI session and flows')
	.parse(process.argv);

const stats = Stats.fetch('main');
logger.setLevel(program.logLevel || 'info');

async function initialize() {
	try {
		// Read configuration
		let cfg = await Config.read(program.file || "./examples/config/cfg001.json",null,program.test);

		// Validation errors
		if(cfg.$$errors) {
			cfg.$$errors.forEach(err=>{
				logger[err.sev||'warn'](err);
				if(err.err) logger.error(err.err);
			});
			if(cfg.$$errors.filter(err=>err.sev=='error').length)	{
				logger.error(`Config file has severe errors. Cannot continue`);
				process.exit(1);
			}
		}
		else {
			logger.info('Valid config file');
		}

		// Only test config. Exit
		if(program.test) {
			process.exit(0);
		}

		logger.info(`Config loaded!`);
		var nsyslog = new NSyslog(cfg);

		nsyslog.on('stats',other=>{
			stats.merge(other);
		});

		if(program.cli || program.cliStart) {
			if(program.cliStart) {
				await nsyslog.start();
			}

			require('./lib/cli')(nsyslog,'nsyslog');
			process.on('SIGINT',()=>{});
			process.on('SIGTERM', ()=>{});
		}
		else {
			async function finalize() {
				try {await nsyslog.stop();}catch(err){logger.error(err);}
				setTimeout(()=>process.exit(1),500);
			}

			process.on('SIGTERM', finalize);
			process.on('SIGINT', finalize);

			setInterval(()=>{
				logger.info(`${new Date()} : ${JSON.stringify(stats.all())}`);
			},1000);

			await nsyslog.start();
		}
	}catch(err) {
		logger.error(err);
		process.exit(1);
	}
}

initialize();
