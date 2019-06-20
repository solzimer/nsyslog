const
	colors = require('colors'),
	Stats = require('../stats'),
	cluster = require('../cluster'),
	stats = Stats.fetch('main');

const task = {start:[],callback:[]};
const MODULE = 'nsyslog-cli';
const CMD = {
	subscribe : "subscribe",
	unsubscribe : "unsubscribe",
	emit : "emit",
};

// Child process CLI
if(!cluster.isMaster) {
	function init(vorpal, instance) {
		cluster.on(MODULE,async (process,module,msg)=>{
			try {
				switch(msg.cmd) {
					case CMD.subscribe :
						subscribe(process,msg);
						break;
					case CMD.unsubscribe :
						unsubscribe(process,msg);
						break;
					default :
						throw new Error(`Unkown command ${msg.cmd}`);
				}
			}catch(err) {
				process.send({module,cmd:CMD.error,error:err.message,cid:msg.cid||null});
			}
		});

		function subhandler(mode,entry) {
			process.send({module:MODULE,cmd:CMD.emit,mode,entry});
		}

		function subscribe(process,msg) {
			let args = msg.args;
			let mode =	args.options.in? 'input' :
									args.options.ack? 'ack' : 'output';

			let mod = instance.modules[msg.type][args.id];
			mod.streams.forEach(str=>str.subscribe(mode,subhandler));
		}

		function unsubscribe(process,msg) {
			let args = msg.args;
			let mode =	args.options.in? 'input' :
									args.options.ack? 'ack' : 'output';

			let mod = instance.modules[msg.type][args.id];
			mod.streams.forEach(str=>str.unsubscribe(mode,subhandler));
		}
	}

	module.exports = init;
}

// Master process CLI
else {
	function init(vorpal, instance)  {
		vorpal.
		  command('input <id>').
			option('-o, --out', 'Shows output entries <default>').
			description('Prints output entries for Input Components').
			autocomplete(()=>Object.keys(instance.modules.inputs)).
			action(function(args,cb){
				fnsubscribe('inputs',args,cb);
			});

		vorpal.
		  command('processor <id>').
			option('-i, --in', 'Shows input entries').
			option('-o, --out', 'Shows output entries <default>').
			option('-a, --ack', 'Shows acked entries').
			description('Prints input/acked/output entries for Processor Components').
			autocomplete(()=>Object.keys(instance.modules.processors)).
		  action(function(args,cb){
				fnsubscribe('processors',args,cb);
			});

		vorpal.
		  command('transporter <id>').
			option('-i, --in', 'Shows input entries').
			option('-o, --out', 'Shows output entries <default>').
			option('-a, --ack', 'Shows acked entries').
			description('Prints input/output for Transporter Components').
			autocomplete(()=>Object.keys(instance.modules.transporters)).
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
		  action(function(){
				console.log(JSON.stringify(instance.config.$$raw,null,2));
			});

		vorpal.
		  command('start').
			description('Starts flows').
		  action(async function(args,callback){
				await instance.start();
				task.start.forEach(cb=>cb(callback));
				task.start = [];
			});

		vorpal.
		  command('stop').
			description('Stop flows').
			action(async function(args,callback){
				await instance.stop();
				callback();
			});

		vorpal.
		  command('pause').
			description('Pause flows').
			action(async function(args,callback){
				await instance.pause();
				callback();
			});

		vorpal.
		  command('resume').
			description('Resume flows').
			action(async function(args,callback){
				await instance.resume();
				callback();
			});

		vorpal.on('keypress',evt=>{
			if((evt.e.value=='q'||evt.e.value=='Q') && (task.callback.length)) {
				console.log('CANCELLED!');
				task.callback.forEach(cb=>cb());
				task.callback = [];
				task.start = [];
			}
		});

		cluster.on(MODULE,(child,module,msg)=>{
			console.log(`${msg.mode}:`.green, msg.entry);
		});

		function fnsubscribe(type,args,callback) {
			let mode =	args.options.in? 'input' :
									args.options.ack? 'ack' : 'output';

			let mod = instance.modules[type][args.id];

			if(!mod) {
				console.log(`Component of type "${type}" with ID "${args.id}" doesn't exist`);
			}
			else {
				console.log('\n********* Press Q to cancel *********\n\n');
				let fn = (mode,entry)=>console.log(`${mode}:`.green, entry);
				mod.streams.forEach(str=>str.subscribe(mode,fn));
				cluster.broadcast(MODULE,{cmd:CMD.subscribe,type,args});
				task.start.push(callback=>{fnsubscribe(type,args,callback);});
				task.callback.push(()=>{
					mod.streams.forEach(str=>str.unsubscribe(mode,fn));
					cluster.broadcast(MODULE,{cmd:CMD.unsubscribe,type,args});
				});
			}

			callback();
		}

		function fnstats(args, callback) {
			let tival = parseInt(args.interval);

			if(isNaN(tival)) {
				console.log(stats.all());
			}
			else {
				console.log('\n********* Press Q to cancel *********\n\n');
				console.log(stats.all());

				let ival = setInterval(()=>console.log('stats'.yellow,stats.all()),tival*1000);
				task.callback.push(()=>{clearInterval(ival);});
			}
			callback();
		}
	}

	module.exports = init;
}
