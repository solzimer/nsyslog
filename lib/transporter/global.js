const
	Transporter = require('.'),
	extend = require('extend'),
	Shm = require('../shm'),
	logger = require('../logger'),
	jsexpr = require("jsexpr");

const DEF_CONF = {
	"input" : "${originalMessage}",
	"output" : "nsyslog"
};

const OUTCACHE = {};
Shm.shm.on('hset',(parent,key,value)=>{
	if(parent!='global') return;
	if(!OUTCACHE[key]) {
		OUTCACHE[key] = jsexpr.assign(key);
	}
	OUTCACHE[key](global,value);
	logger.silly("HSET",{parent,key,value});
});

class GlobalTransporter extends Transporter {
	constructor(id,type) {
		super(id,type);
	}

	configure(config, callback) {
		config = extend(true,{},DEF_CONF,config);

		this.config = config;
		this.input = jsexpr.expr(config.input || DEF_CONF.input);
		this.output = jsexpr.assign(config.output || DEF_CONF.output);
		this.outkey = config.output || DEF_CONF.output;

		if(callback) callback();
	}

	transport(entry, callback) {
		var msg = this.input(entry);
		this.output(global, msg);
		Shm.hset('global',this.outkey,msg);
		callback(null,entry);
	}
}

module.exports = GlobalTransporter;