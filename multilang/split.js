const {BasicBolt} = require('./storm');

class SplitBolt extends BasicBolt {
	constructor() {
		super();
	}

	initialize(conf, context, callback) {
			callback();
	}

	process(tup, done) {
		var words = tup.values[0].split(" ");

		words.forEach((word) => {
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
