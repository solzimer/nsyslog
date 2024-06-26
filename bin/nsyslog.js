#!/usr/bin/env node
const
	path = require('path'),
	program = require("commander"),
	logger = require('../lib/logger'),
	extend = require('extend'),
	fs = require('fs-extra'),
	Config = require("../lib/config"),
	Stats = require('../lib/stats'),
	TLS = require('../lib/tls'),
	NSyslog = require("../lib/nsyslog");

const stats = Stats.fetch('main');
program.version('0.0.1')
	.allowUnknownOption()
	.option('-f, --file [file]', 'Config file')
	.option('-t, --test', 'Only validate config file')
	.option('-m, --merge [files]', 'Merge with these files (comma separated)')
	.option('-l, --log-file [path]', 'Output log file (default stdout)')
	.option('-L, --log-level [level]', 'Debug level')
	.option('-v, --verbose','Verbose stats logging')
	.option('--ssl-cert','SSL Private key for encryption')
	.option('--ssl-key','SSL Private key for decryption')
	.option('--ssl-key-pass','SSL Private key password for decryption')
	.option('--encrypt [data]','Data for encryption')
	.option('--decrypt [data]','Data for decryption')
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
	Config.events.on('file',file=>logger.info(`Reading file: ${file}`));
	Config.events.on('rawjson',mergeFiles);

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

function mergeFiles(json) {
	if(program.merge) {
		program.merge.
			split(",").
			map(f=>f.trim()).
			forEach(f=>{
				try {
					let file = JSON.parse(fs.readFileSync(f,'utf-8'));
					extend(true, json, file);
				}catch(err) {
					logger.warn(err);
					logger.warn(`File '${f}' will be ignored`);
				}
			});
	}
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

		if(program.encrypt) {
			console.log(TLS.encrypt({cert:program.sslCert}, program.encrypt));
			process.exit(0);
		}
		else if(program.decrypt) {
			console.log(TLS.decrypt({key:program.sslKey,passphrase:program.sslKeyPass}, program.decrypt));
			process.exit(0);
		}

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
