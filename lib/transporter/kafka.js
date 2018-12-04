const
	Transporter = require("./"),
	extend = require('extend'),
	jsexpr = require("jsexpr"),
	logger = require('../logger'),
	URL = require('url'),
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
	}

	configure(config, callback) {
		config = extend({},DEFAULTS,config);

		this.url = config.url;
		this.msg = config.format? jsexpr.expr(config.format) : vfn;
		this.topic = jsexpr.expr(config.topic);
		this.mode = MODES[config.mode] || MODE.roundrobin;
		this.field = config.field? jsexpr.expr(config.field) : jsexpr.expr("0");

		callback();
	}

	start(callback) {
		let nodes = URL.parse(this.url).host;

		this.client = new kafka.KafkaClient({kafkaHost:nodes, requestTimeout:10000});
		this.producer = new Producer(this.client);

		this.producer.on('ready', ()=>{
			logger.debug(`Kafka connection successful on `,nodes);
			callback();
		});
		this.producer.on("error", logger.error.bind(logger));
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

		let pl = [{topic, partition, messages:[msg]}];
		this.producer.send(pl, callback);
	}

	stop(callback) {
		this.client.close();
		callback();
	}
}

module.exports = KafkaTransporter;
