#!/usr/bin/env node
const
	path = require('path'),
	program = require("commander"),
	logger = require('../lib/logger'),
	Config = require("../lib/config"),
	Stats = require('../lib/stats'),
	NSyslog = require("../lib/nsyslog");

const stats = Stats.fetch('main');
program.version('0.0.1')
	.option('-f, --file [file]', 'Config file')
	.option('-t, --test', 'Only validate config file')
	.option('-l, --log-file [path]', 'Output log file (default stdout)')
	.option('-L, --log-level [level]', 'Debug level')
	.option('-q, --quiet','Disable stats logging')
	.option('--cli', 'Starts CLI session')
	.option('--cli-start', 'Starts CLI session and flows')
	.parse(process.argv);

logger.setLevel(program.logLevel || 'info');
if(program.logFile) {
	logger.setFileTransport({
		file : path.resolve(program.logFile)
	});
}

async function initialize() {
	try {
		// Read configuration
		logger.warn('NSyslog is on beta status, not ready for production yet!');
		let path = program.file || `${__dirname}/../data/config.json`;
		logger.info(`Reading configuration file "${path}"`);
		let cfg = await Config.read(path,null,program.test);

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
		let nsyslog = new NSyslog(cfg);
		let instance = {path,stats,nsyslog};

		nsyslog.on('stats',other=>{
			stats.merge(other);
		});

		nsyslog.on('destroy',nsyslog=>{
			nsyslog.removeAllListeners();
		});

		if(program.cli || program.cliStart) {
			if(program.cliStart) {
				await nsyslog.start();
			}

			require('../lib/cli')(instance,'nsyslog');
			process.on('SIGINT',()=>{});
			process.on('SIGTERM', ()=>{});
		}
		else {
			async function finalize() {
				let nsyslog = instance.nsyslog;
				try {await nsyslog.stop();}catch(err){logger.error(err);}
				setTimeout(()=>process.exit(1),500);
			}

			process.on('SIGTERM', finalize);
			process.on('SIGINT', finalize);

			if(!program.quiet) {
				setInterval(()=>{
					logger.info(`${new Date()} : ${JSON.stringify(stats.all())}`);
				},1000);				
			}

			await nsyslog.start();
		}
	}catch(err) {
		logger.error(err);
		process.exit(1);
	}
}

initialize();
