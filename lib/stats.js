const REGISTRY = {};

class Stats {
	constructor() {
		this.stats = {
			input : {},
			processor : {},
			transporter : {}
		}
	}

	acc(stage,module,field,val) {
		let stats = this.stats;
		let id = typeof(module)=='string'? module : module.instance.id;
		stats[stage][id] = stats[stage][id] || {id:id, ack:0, fail:0, emit:0};
		stats[stage][id][field] += val;
	}

	emit(stage,module,val) {
		this.acc(stage,module,'emit',val||1);
	}

	ack(stage,module,val) {
		this.acc(stage,module,'ack',val||1);
	}

	fail(stage,module,val) {
		this.acc(stage,module,'fail',val||1);
	}

	merge(other) {
		Object.keys(other).forEach(stage=>{
			Object.keys(other[stage]).forEach(module=>{
				this.emit(stage,module,other[stage][module].emit);
				this.ack(stage,module,other[stage][module].ack);
				this.fail(stage,module,other[stage][module].fail);
			});
		})
	}

	all() {
		return this.stats;
	}

	clean() {
		let stats = this.stats;
		stats.input = {};
		stats.processor = {};
		stats.transporter = {};
	}

	static register(key,instance) {
		REGISTRY[key] = instance;
	}

	static fetch(key) {
		if(!REGISTRY[key]) {
			REGISTRY[key] = new Stats();
		}

		return REGISTRY[key];
	}
}

module.exports = Stats;
