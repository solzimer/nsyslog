const
	vorpal = require('vorpal')(),
	Stats = require('./stats'),
	stats = Stats.fetch('main');

var instance = null;
var ivalStats = null;

vorpal
  .command('input <id> <mode>')
	.description('Prints input/output for Input Components: id: Input ID, mode: in,out')
  .action(acb);

vorpal
  .command('processor <id> <mode>')
	.description('Prints input/output for Processor Components: id: Input ID, mode: in,out')
  .action(acb);

vorpal
  .command('transporter <id> <mode>')
	.description('Prints input/output for Transporter Components: id: Input ID, mode: in,out')
  .action(acb);

vorpal
  .command('stats [interval]')
	.description('Prints statistics. Interval: Optional, refresh seconds')
  .action(fnstats)
	.cancel(fnstatsCancel);

function acb(args, callback) {
	console.log("Hola hola vecinito");
	callback();
}

function fnstats(args, callback) {
	let ival = parseInt(args.interval);
	console.log(stats.all());

	if(isNaN(ival)) {
		callback();
	}
	else {
		ivalStats = setInterval(()=>{
			console.log(stats.all());
		},ival*1000);
	}
}

function fnstatsCancel() {
	clearInterval(ivalStats);
}

module.exports = function(nsyslog, prompt) {
	instance = nsyslog;
	vorpal.delimiter(`${prompt}> `).show();
}
