const {BasicBolt} = require('./storm');

class WaitBolt extends BasicBolt {
	constructor() {
		super();
	}

	initialize(conf, context, callback) {
		this.timeout = conf.timeout;
		callback();
	}

	process(tup, done) {
		setTimeout(()=>{
			this.emit({tuple: tup.values, anchorTupleId: tup.id}, (taskIds)=>{
				this.log(tup.id + ' sent to task ids - ' + taskIds);
			});
			done();
		},this.timeout);
	}
}

if(module.parent) {
	module.exports = WaitBolt;
}
else {
	new WaitBolt().run();
}
