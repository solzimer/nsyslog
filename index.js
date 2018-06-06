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

async function initialize() {
	try {
		let cfg = await Config.read(program.file || "./config/cfg001.json");

		logger.info(`Config loaded!`);
		var nsyslog = new NSyslog(cfg);
		nsyslog.start();

		nsyslog.on('error',()=>{});
		nsyslog.on('all',(event,stage,flow,module,entry)=>{
			let id = module.instance.id;
			stats[stage][id] = stats[stage][id] || {id:id, success:0, fail:0};

			if(event!='error') {
				//logger.debug(`${event} : ${stage} : ${flow.id} => ${module.instance.id} => ${entry.seq}`);
				stats[stage][id].success++;
			}
			else {
				//logger.error(`${event} : ${stage} : ${flow.id} => ${module.instance.id}`);
				//logger.error(entry);
				stats[stage][id].fail++;
			}
		});

		setInterval(()=>{
			logger.info(stats);
		},1000);

	}catch(err) {
		logger.error(err);
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
	logger.error("ERR");
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
