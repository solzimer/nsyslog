if(module.parent) {
	module.exports = require("./lib/nsyslog");
	return;
}

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

function stat(stage,module) {
	let id = module.instance.id;
	stats[stage][id] = stats[stage][id] || {id:id, ack:0, fail:0, emit:0};
	return stats[stage][id];
}

async function initialize() {
	try {
		let ti = Date.now();
		let cfg = await Config.read(program.file || "./config/cfg001.json");

		logger.info(`Config loaded!`);
		var nsyslog = new NSyslog(cfg);

		nsyslog.on('ack',(stage,flow,module,entry)=>{
			let st = stat(stage,module);
			st.ack++;
		});

		nsyslog.on('data',(stage,flow,module,entry)=>{
			let st = stat(stage,module);
			st.emit++;
			if(module.instance.id=="null" && st.emit==100000) {
				let tf = Date.now();
				console.log(`*************** PROCESS TAKE ${tf-ti} ms *************`);
				process.exit(0);
			}
		});

		nsyslog.on('error',(stage,flow,module,error)=>{
			let st = stat(stage,module);
			st.fail++;
			logger.error(error);
		});

		setInterval(()=>{
			logger.info(`${new Date()} : ${JSON.stringify(stats)}`);
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
