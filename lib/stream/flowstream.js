const
	Component = require('../component'),
	Events = Component.Events,
	logger = require('../logger'),
	Duplex = require("stream").Duplex,
	Transform = require("stream").Transform;

class FlowStream extends Transform {
	constructor(flows,maxPending) {
		super({
			objectMode:true,
			highWaterMark:maxPending,
		});
		this.seq = 0;
		this.flows = flows;
		this.instance = {id:`FlowStream_${Component.nextSeq()}`};
		Component.handlePipe(this);
	}

	async _transform(entry, encoding, callback) {
		let flows = this.flows;
		let aflows = flows.filter(f=>f.from(entry));

		entry.seq = this.seq++;
		entry.flows = aflows.map(f=>f.id);

		let all = aflows.
			filter(flow=>flow.when(entry)).
			map(flow=>new Promise(ok=>flow.stream.write(entry,null,ok)));

		await Promise.all(all);
		callback();
	}
};

module.exports = FlowStream;
