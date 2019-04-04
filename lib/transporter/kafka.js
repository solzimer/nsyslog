const
	Transporter = require("./"),
	extend = require('extend'),
	jsexpr = require("jsexpr"),
	logger = require('../logger'),
	URL = require('url'),
	TLS = require("../tls"),
	kafka = require('kafka-node'),
	Producer = kafka.HighLevelProducer;

const DEFAULTS = {
	url : "kafka://localhost:9092",
	topic : "nsyslog",
	mode : "roundrobin",
	field : "0"
}

const MODES = {
	roundrobin : "roundrobin",
	hashed : "hashed",
	fixed : "fixed"
}

const DEF_CONF = {
	tls : TLS.DEFAULT
}

const vfn = (entry)=>entry;
const hash = function(str) {
  var hash = 0, i, chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr   = str.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

class KafkaTransporter extends Transporter {
	constructor(id,type) {
		super(id,type);
		this.tmap = {};
		this.hashes = {};
		this.topics = {};
		this.ival = null;
	}

	async configure(config, callback) {
		config = extend({},DEFAULTS,config);

		this.url = (Array.isArray(config.url)? config.url : [config.url]);
		this.msg = config.format? jsexpr.expr(config.format) : vfn;
		this.topic = jsexpr.expr(config.topic);
		this.mode = MODES[config.mode] || MODE.roundrobin;
		this.field = config.field? jsexpr.expr(config.field) : jsexpr.expr("0");
		this.tlsopts = extend({},DEF_CONF.tls,config.tls);
		this.istls = this.url.reduce((ret,url)=>ret||url.startsWith("kafkas"),false);

		if(this.istls) {
			this.tlsopts = await TLS.configure(this.tlsopts);
		}

		callback();
	}

	start(callback) {
		let nodes = this.url.
			map(url=>URL.parse(url)).
			map(url=>`${url.hostname||'localhost'}:${url.port||9092}`).
			join(",");

		let opts = {kafkaHost:nodes, requestTimeout:10000};
		if(this.istls) opts.sslOptions = this.tlsopts;

		this.client = new kafka.KafkaClient(opts);
		this.producer = new Producer(this.client);

		this.producer.on('ready', ()=>{
			logger.debug(`Kafka connection successful on `,nodes);
			callback();
		});
		this.producer.on("error", logger.error.bind(logger));

		this.ival = setTimeout(this.loop.bind(this),100);
	}

	async loop() {
		let tnames = Object.keys(this.topics), tnlen = tnames.length;
		let pall = [];

		for(let i=0;i<tnlen;i++) {
			let topic = tnames[i];
			let parts = this.topics[topic];
			let pnames = Object.keys(parts), pnlen = pnames.length;
			for(let j=0;j<pnlen;j++) {
				let partition = pnames[j];
				let items = parts[partition], ilen = items.length;
				let messages = items.map(item=>item.msg);
				let pl = [{topic, partition, messages}];
				parts[partition] = [];
				pall.push(new Promise(ok=>{
					this.producer.send(pl, ()=>{
						for(let k=0;k<ilen;k++) {
							items[k].callback();
						}
						ok();
					});
				}));
			}
		}

		await Promise.all(pall);
		this.ival = setTimeout(this.loop.bind(this),100);
	}

	publish(topic, partition, msg, callback) {
		this.topics[topic] = this.topics[topic] || {};
		this.topics[topic][partition] = this.topics[topic][partition] || [];
		this.topics[topic][partition].push({msg,callback});
	}

	transport(entry,callback) {
		let msg = this.msg(entry);
		let topic = this.topic(entry);
		let tmap = this.tmap;
		let partition = 0;

		if(typeof(msg)!='string')
			msg = JSON.stringify(msg);

		let info = this.client.topicMetadata[topic];
		let max = info? Object.keys(info).length : 1;

		switch(this.mode) {
			case MODES.roundrobin :
				if(!tmap[topic]) tmap[topic] = 0;
				else tmap[topic] = (tmap[topic]+1) % max;
				partition = tmap[topic];
				break;
			case MODES.fixed :
				partition = parseInt(this.field(entry)) || 0;
				break;
			case MODES.hashed :
				let val = this.field(entry);
				if(!this.hashes[val]) this.hashes[val] = hash(val);
				partition = this.hashes[val] % max;
				break;
			default :
				partition = 0;
		}

		if(Object.keys(this.hashes)>1000)
			this.hashes = {};

		this.publish(topic,partition,msg,callback);
	}

	stop(callback) {
		clearTimeout(this.ival);
		this.client.close();
		callback();
	}
}

module.exports = KafkaTransporter;
