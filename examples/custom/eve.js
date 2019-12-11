const Input = require('../../lib/nsyslog').Core.Input;

const EVT = {
	"timestamp":"2018-09-04T11:10:38.000220+0100","flow_id":727167390401089,"event_type":"flow",
	"src_ip":"10.192.231.200","src_port":123,"dest_ip":"150.214.94.10","dest_port":123,"proto":"UDP",
	"app_proto":"failed","flow":{"pkts_toserver":1,"pkts_toclient":0,"bytes_toserver":90,"bytes_toclient":0,
	"start":"2018-09-04T11:10:07.672321+0100","end":"2018-09-04T11:10:07.672321+0100","age":0,
	"state":"new","reason":"timeout","alerted":false}
};

function randIp() {
	let res = [];
	for(let i=0;i<4;i++)
		res.push(Math.floor(Math.random()*5));
	return res.join(".");
}

function randPort() {
	return Math.floor(Math.random()*65536);
}

class EveInput extends Input {
	constructor(id) {
		super(id);
		this.paused = false;
	}

	configure(config,callback) {
		config = config || {};
		callback();
	}

	get mode() {
		return Input.MODE.pull;
	}

	next(callback) {
		setImmediate(()=>{
			EVT.src_ip = randIp();
			EVT.dest_ip = randIp();
			EVT.src_p = randPort();
			EVT.dest_p = randPort();
			let msg = {originalMessage : JSON.stringify(EVT)};
			callback(null,msg);
		});
	}

	key(entry) {
		return `${this.id}@eve`;
	}
}

module.exports = EveInput;
