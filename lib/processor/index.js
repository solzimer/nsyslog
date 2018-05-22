class Processor  {
	constructor(id, sticky) {
		this.id = id;
		this.sticky = sticky;
	}

	configure(cfg, callback) {
		if(callback) callback();
	}

	process(entry,callback) {
		callback(null,entry);
	}
}

module.exports = Processor;
