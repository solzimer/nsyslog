const
	colorize = require('json-colorizer'),
	Stats = require('../stats'),
	cluster = require('../cluster'),
	NSyslog = require('../nsyslog'),
	stats = Stats.fetch('main'),
	{PROC_MODE} = require('../constants'),
	Config = NSyslog.Core.Config;

function cj(json) {return colorize(json,{pretty:true})};
const task = {start:[],callback:[]};
const MODULE = 'nsyslog-cli';

// Child process CLI
if(!cluster.isMaster) {
	function init(vorpal, instance) {}
	module.exports = init;
}

// Master process CLI
else {
	function init(vorpal, instance)  {
		vorpal.
		  command('input <id>').
			option('-o, --out', 'Shows output entries <default>').
			description('Prints output entries for Input Components').
			autocomplete(()=>Object.keys(instance.nsyslog.modules.inputs)).
			action(function(args,cb){
				fnsubscribe('inputs',args,cb);
			});

		vorpal.
		  command('processor <id>').
			option('-i, --in', 'Shows input entries').
			option('-o, --out', 'Shows output entries <default>').
			option('-a, --ack', 'Shows acked entries').
			description('Prints input/acked/output entries for Processor Components').
			autocomplete(()=>Object.keys(instance.nsyslog.modules.processors)).
		  action(function(args,cb){
				fnsubscribe('processors',args,cb);
			});

		vorpal.
		  command('transporter <id>').
			option('-i, --in', 'Shows input entries').
			option('-o, --out', 'Shows output entries <default>').
			option('-a, --ack', 'Shows acked entries').
			description('Prints input/output for Transporter Components').
			autocomplete(()=>Object.keys(instance.nsyslog.modules.transporters)).
			action(function(args,cb){
				fnsubscribe('transporters',args,cb);
			});

		vorpal.
		  command('stats [interval]').
			description('Prints statistics. Interval: Optional, refresh seconds').
		  action(fnstats);

		vorpal.
		  command('config').
			description('Prints complete config file').
		  action(function(args,callback){
				this.log(cj(instance.nsyslog.config.$$raw));
				callback();
			});

		vorpal.
		  command('reload').
			description('Reload configuration').
		  action(async function(args,callback){
				await instance.nsyslog.destroy();
				await newInstance(instance);
				callback();
			});

		vorpal.
		  command('start').
			description('Starts flows').
		  action(async function(args,callback){
				await instance.nsyslog.start();
				task.start.forEach(cb=>cb(callback));
				task.start = [];
			});

		vorpal.
		  command('stop').
			description('Stop flows').
			action(async function(args,callback){
				await instance.nsyslog.stop();
				callback();
			});

		vorpal.
		  command('pause').
			description('Pause flows').
			action(async function(args,callback){
				await instance.nsyslog.pause();
				callback();
			});

		vorpal.
		  command('resume').
			description('Resume flows').
			action(async function(args,callback){
				await instance.nsyslog.resume();
				callback();
			});

		vorpal.on('keypress',(evt)=>{
			if((evt.e.value=='q'||evt.e.value=='Q') && (task.callback.length)) {
				vorpal.log('\n************* Cancelled *************\n\n');
				task.callback.forEach(cb=>cb());
				task.callback = [];
				task.start = [];
			}
		});

		const MockInstance = {
			log() {vorpal.log('Instance has no valid config file')},
			start() {this.log()},
			stop() {this.log()},
			pause() {this.log()},
		}

		async function newInstance(instance) {
			// Read configuration
			let cfg = await Config.read(instance.path);

			// Validation errors
			if(cfg.$$errors) {
				cfg.$$errors.forEach(err=>{
					vorpal.log(err.sev||'warn',err);
					if(err.err) vorpal.log(err.err);
				});
				if(cfg.$$errors.filter(err=>err.sev=='error').length)	{
					vorpal.log(`Config file has severe errors. Cannot continue`);
					instance.nsyslog = MockInstance;
				}
			}
			else {
				vorpal.log('Valid config file');
				let nsyslog = new NSyslog(cfg);
				nsyslog.on('stats',other=>instance.stats.merge(other));
				instance.nsyslog = nsyslog;
			}
		}

		function logentry(type,id,mode,entry) {
			vorpal.log(`${type} - ${id} - ${mode}:`.green, cj(entry));
		}

		function fnsubscribe(type,args,callback) {
			let mode =	args.options.in? PROC_MODE.input :
									args.options.ack? PROC_MODE.ack : PROC_MODE.output;

			try {
				instance.nsyslog.subscribe(type,args.id,mode,logentry);
				vorpal.log('\n********* Press Q to cancel *********\n\n');
				task.start.push(callback=>{fnsubscribe(type,args,callback);});
				task.callback.push(()=>{
					instance.nsyslog.unsubscribe(type,args.id,mode,logentry);
				});
			}catch(err) {
				vorpal.log(`Component of type "${type}" with ID "${args.id}" doesn't exist`);
			}

			callback();
		}

		function fnstats(args, callback) {
			let tival = parseInt(args.interval);

			if(isNaN(tival)) {
				vorpal.log('stats'.yellow,cj(stats.all()));
			}
			else {
				vorpal.log('\n********* Press Q to cancel *********\n\n');
				vorpal.log('stats'.yellow,cj(stats.all()));

				let ival = setInterval(()=>vorpal.log('stats'.yellow,cj(stats.all())),tival*1000);
				task.callback.push(()=>{clearInterval(ival);});
			}
			callback();
		}
	}

	module.exports = init;
}
