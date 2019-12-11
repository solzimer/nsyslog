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
	.option('-v, --verbose','Verbose stats logging')
	.option('--cli', 'Starts CLI session')
	.option('--cli-start', 'Starts CLI session and flows')
	.parse(process.argv);

function setLogger() {
	logger.setLevel(program.logLevel || 'info');
	if(program.logFile) {
		logger.setFileTransport({
			file : path.resolve(program.logFile)
		});
	}
}

async function configure() {
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
			throw new Error('Configuration severe errors');
		}
	}
	else {
		logger.info('Valid config file');
	}

	return cfg;
}

function createInstance(cfg) {
	let nsyslog = new NSyslog(cfg);
	let instance = {path,stats,nsyslog};

	nsyslog.on('stats',other=>{
		stats.merge(other);
	});

	nsyslog.on('destroy',nsyslog=>{
		nsyslog.removeAllListeners();
	});

	return instance;
}

async function startCLI(instance) {
	let nsyslog = instance.nsyslog;

	if(program.cliStart) {
		await nsyslog.start();
	}

	require('../lib/cli')(instance,'nsyslog');
	process.on('SIGINT',()=>{});
	process.on('SIGTERM', ()=>{});
}

async function startStandalone(instance) {
	let nsyslog = instance.nsyslog;

	async function finalize() {
		try {await nsyslog.stop();}catch(err){logger.error(err);}
		setTimeout(()=>process.exit(1),500);
	}

	process.on('SIGTERM', finalize);
	process.on('SIGINT', finalize);

	if(program.verbose) {
		setInterval(()=>{
			logger.info(`${new Date()} : ${JSON.stringify(stats.all())}`);
		},1000);
	}

	await nsyslog.start();
}

async function initialize() {
	try {
		// Read configuration
		setLogger();
		logger.info(`Welcome to NSyslog`);
		let cfg = await configure();

		// Only test config. Exit
		if(program.test) {
			process.exit(0);
		}

		// Create NSyslog instance
		logger.info(`Config loaded!`);
		let instance = createInstance(cfg);

		if(program.cli || program.cliStart) {
			startCLI(instance);
		}
		else {
			startStandalone(instance);
		}
	}catch(err) {
		logger.error(err);
		process.exit(1);
	}
}

initialize();
