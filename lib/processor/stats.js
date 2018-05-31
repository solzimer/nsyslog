const	Processor = require("./");

class StatsProcessor extends Processor {
	constructor(id) {
		super(id);
		this.map = {};
		this.ival = null;
	}

	process(entry,callback) {
		var map = this.map;

		entry.flows.forEach(f=>{
			map[f] = map[f] || 0;
			map[f]++;
		});

		if(!this.ival) {
			this.ival = setInterval(()=>{
				for(var i in map) {
					console.log(process.pid,`Flow ${i} => ${map[i]}`);
					map[i] = 0;
				}
			},10000);
		}
		callback(null,entry);
	}
}

module.exports = StatsProcessor;
