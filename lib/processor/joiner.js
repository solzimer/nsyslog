const
	Processor = require("./"),
	jsexpr = require('jsexpr');

const MAX_WAIT = 2000;

class JoinerProcessor extends Processor {
	constructor(id, type) {
		super(id, type);
		this.buffer = [];
		this.iva = null;
		this.last = null;
	}

	configure(conf, callback) {
		this.input = jsexpr.expr(conf.input||'${originalMessage}');
		this.output = jsexpr.assign(conf.output||'out');
		this.when = jsexpr.eval(conf.when || "true");
		this.delimiter = conf.delimiter || '\n';
		this.max = conf.max || 1000;
		this.wait = conf.wait || MAX_WAIT;
		callback();
	}
	
	process(entry, callback) {
		let msg = this.input(entry);

		if(this.when(entry) && this.buffer.length) {
			let last = this.last;
			this.output(last,this.buffer.join(this.delimiter));
			this.buffer = [msg];
			this.last = entry;
			return callback(null,last);
		}
		else {
			if(this.ival)
				clearTimeout(this.ival);

			this.buffer.push(msg);
			while(this.buffer.length>this.max)
				this.buffer.shift();

			this.ival = setTimeout(()=>{
				this.output(this.last,this.buffer.join(this.delimiter));
				this.buffer = [];
				this.push(this.last,()=>{});
			},this.wait);

			this.last = entry;
			return callback();
		}
	}
}

module.exports = JoinerProcessor;
