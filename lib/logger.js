const cluster = require('./cluster');
const winston = require("winston");
const MODULE = 'nsyslog-logger';

if(cluster.isMaster) {

	winston.level = 'info';
	instance = winston;

	cluster.on(MODULE,(child,module,msg)=>{
		try {
			instance[msg.cmd](...msg.args,`[child:${child.pid}]`);
		}catch(err) {
			instance.error(err);
		}
	});

	module.exports = {
		setInstance(newInstance) {
			instance = newInstance
		},
		setLevel(level) {
			instance.level = level;
		},
		info() {
			instance.info.apply(instance,arguments)
		},
		debug() {
			instance.debug.apply(instance,arguments)
		},
		trace() {
			instance.silly.apply(instance,arguments)
		},
		silly() {
			instance.silly.apply(instance,arguments)
		},
		log() {
			instance.log.apply(instance,arguments)
		},
		error() {
			instance.error.apply(instance,arguments)
		},
		warn() {
			instance.warn.apply(instance,arguments)
		},
		warning() {
			instance.warn.apply(instance,arguments)
		}
	};
}
else {
	var level = 'info';
	var ilevel = winston.levels[level];

	function send(cmd,args) {
		let cilevel = winston.levels[level];

		// Avoid send innecesary logs
		if(cilevel<=ilevel) {
			setImmediate(()=>{
				args = Array.from(args);
				process.send({module:MODULE,cmd,args});
			});
		}
	}

	module.exports = {
		setInstance() {},
		setLevel(newlevel) {
			level = newlevel || level;
			ilevel = winston.levels[level];
		},
		info() {send('info',arguments);},
		debug() {send('debug',arguments);},
		trace() {send('silly',arguments);},
		silly() {send('silly',arguments);},
		log() {send('log',arguments);},
		error() {send('error',arguments);},
		warn() {send('warn',arguments);},
		warning() {send('warn',arguments);}
	}
}
