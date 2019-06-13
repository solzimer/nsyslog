const
	vorpal = require('vorpal')(),
	colors = require('colors'),
	Stats = require('./stats'),
	stats = Stats.fetch('main');

var instance = null;
var task = {start:[],callback:[]};

vorpal.ui.submit = function(line) {
	if (this._activePrompt) {
		this._activePrompt.rl.emit('line',line);
	}
	return this;
}

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

function fnsubscribe(type,args,callback) {
	let mode =	args.options.in? 'input' :
							args.options.ack? 'ack' : 'output';

	let mod = instance.modules[type][args.id];

	if(!mod) {
		console.log(`Component of type "${type}" with ID "${args.id}" doesn't exist`);
	}
	else {
		console.log('\n********* Press Q to cancel *********\n\n');
		let fn = (entry)=>console.log(`${mode}:`.green, entry);
		mod.streams.forEach(str=>str.subscribe(mode,fn));
		task.start.push(callback=>{fnsubscribe(type,args,callback);});
		task.callback.push(()=>{mod.streams.forEach(str=>str.unsubscribe(mode,fn));});
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

module.exports = function(nsyslog, prompt) {
	instance = nsyslog;
	vorpal.delimiter(`${prompt}> `).show();
	return {
		eval(line) {
			vorpal.ui.submit(line);
		}
	}
}
