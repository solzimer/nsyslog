const
    acker = require('../acker'),
    jsexpr = require('jsexpr'),
	Transporter = require("./");

class AckerTransporter extends Transporter {
	constructor(id,type) {
        super(id,type);
    }

	async configure(config, callback) {
        this.config = config;
        config.acks = config.acks || {};
        try {
            this.ack = Object.keys(config.ack).map((key)=>{
                let format = config.ack[key];
                let expr = jsexpr.expr(format);
                return {key, expr};
            });
            callback();
        }catch(err) {
            callback(err);
        }
	}

	async transport(entry, callback) {
        try {
            let all = this.ack.map(kv=>{
                let val = kv.expr(entry);
                if(val==null || val==undefined) return;
                else return acker.ack(kv.key, entry, val);
            });
            await Promise.all(all);
            callback(null,entry);
        }catch(err) {
            callback(err);
        }
    }
}

module.exports = AckerTransporter;
