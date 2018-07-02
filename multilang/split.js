const {BasicBolt} = require('./storm');

class SplitBolt extends BasicBolt {
	constructor() {
		super();
	}

	initialize(conf, context, callback) {
		this.max = conf.max;
		callback();
	}

	process(tup, done) {
		var words = tup.values[0].split(" ");
		var max = this.max;

		words.forEach((word,i) => {
			if(i>=max) return;
			this.emit({tuple: [word], anchorTupleId: tup.id}, (taskIds)=>{
				this.log(word + ' sent to task ids - ' + taskIds);
      });
		});
		done();
	}
}

if(module.parent) {
	module.exports = SplitBolt;
}
else {
	new SplitBolt().run();
}
