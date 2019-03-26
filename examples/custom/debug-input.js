const Input = require('../../lib/input');

class DebugInput extends Input {
	constructor(id,type) {
		super(id,type);
	}

	configure(config,callback) {
		config = config || {};
		callback();
	}

	get mode() {
		return Input.MODE.pull;
	}

	start(callback) {
		this.seq = 0;
		callback();
	}

	next(callback) {
		setTimeout(()=>{
			callback(null,{
				"type":"debug",
				"src_ip" : "0.0.0.0",
				"dest_ip" : "0.0.0.0",
				"debug" : {
					"id" : this.seq++
				}
			});
		},1000);
	}
}

module.exports = DebugInput;
