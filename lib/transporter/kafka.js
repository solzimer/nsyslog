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
	field : "0",
	retry : true,
	maxRetry : Number.MAX_VALUE
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
		this.config = config = extend({},DEFAULTS,config);

		this.url = (Array.isArray(config.url)? config.url : [config.url]);
		this.msg = config.format? jsexpr.expr(config.format) : vfn;
		this.topic = jsexpr.expr(config.topic);
		this.mode = MODES[config.mode] || MODE.roundrobin;
		this.field = config.field? jsexpr.expr(config.field) : jsexpr.expr("0");
		this.retry = config.retry;
		this.maxRetry = config.maxRetry;
		this.tlsopts = extend({},DEF_CONF.tls,config.tls);
		this.istls = this.url.reduce((ret,url)=>ret||url.startsWith("kafkas"),false);

		if(this.istls) {
			this.tlsopts = await TLS.configure(this.tlsopts,config.$path);
		}

		callback();
	}

	async connect() {
		let hosts = this.url.
			map(url=>URL.parse(url)).
			map(url=>`${url.hostname||'localhost'}:${url.port||9092}`).
			join(",");

		let opts = extend(
			{}, {kafkaHost: hosts, requestTimeout: 10000},
			this.istls? {sslOptions:this.tlsopts} : {}
		);

		this.client = new kafka.KafkaClient(opts);
		await new Promise((ok,rej)=>{
			this.client.on('ready',ok);
			this.client.on('error',rej);
		});
		this.client.removeAllListeners('error');

		this.producer = new Producer(this.client);
		this.producer.on("error", err=>{
			logger.error(err);
			logger.error(`${this.id}: Error on kafka connection. Reconnecting...`);
		});
	}

	start(callback) {
		logger.info(`${this.id}: Start transporter on kafka endpoint`, this.url);
		this.tmap = {};
		this.hashes = {};
		this.topics = {};

		var reconnect = async()=>{
			try {
				clearTimeout(this.ival);
				await this.connect();
				this.loop();
				logger.info(`${this.id}: Kafka connection successfuly`,this.url);
			}catch(err) {
				logger.error(err);
				logger.error(`${this.id}: Error on kafka connection. Reconnecting...`);
				setTimeout(reconnect,2000);
			}
		}

		reconnect();
		callback();
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
				pall.push(new Promise(async(ok)=>{
					let sent = false, retry = this.maxRetry, err = null;
					while(!sent && retry>0) {
						err = await new Promise(ok=>this.producer.send(pl,ok));
						if(err) {
							logger.error(`${this.id} Error sending data to kafka`,err);
							retry--;
							if(!this.retry)
								sent = true;
						}
						else {
							sent = true;
						}
					}

					for(let k=0;k<ilen;k++) {
						items[k].callback(err);
					}
					ok();
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
