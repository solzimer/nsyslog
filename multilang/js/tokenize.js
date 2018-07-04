const {BasicBolt} = require('./storm');

class TokenizeBolt extends BasicBolt {
	constructor() {
		super();
	}

	initialize(conf, context, callback) {
		this.max = conf.max;
		callback();
	}

	process(tup, done) {
		var words = tup.values[0].split(" ");

		//setTimeout(()=>{
			this.emit({tuple: [words.length,words], anchorTupleId: tup.id}, (taskIds)=>{});
			done();
		//},Math.floor(Math.random()*1000));
	}
}

if(module.parent) {
	module.exports = TokenizeBolt;
}
else {
	new TokenizeBolt().run();
}
