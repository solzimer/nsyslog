class ReverseTransport {
	constructor(config) {
		this.config = config;
		this.init(config);
	}

	init(config) {

	}

	transport(entry,callback) {
		var r = Math.random();
		console.log("RANDOM: "+r);
		if(r>0.5) throw new Error("Me cawen to!");
		else callback(null,entry);
	}
}

module.exports = ReverseTransport;
