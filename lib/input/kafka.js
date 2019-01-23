const
	logger = require('../logger'),
	Input = require('./'),
	extend = require('extend'),
	kafka = require('kafka-node'),
	URL = require('url'),
	TLS = require("../tls"),
	Queue = require('../queue'),
	ConsumerGroup = kafka.ConsumerGroup,
	KafkaClient = kafka.KafkaClient;

const MAX_BUFFER = 1000;

const OFFSET = {
	latest : "latest",
	earliest : "earliest",
}

const FORMAT = {
	raw : "raw",
	json : "json"
}

const DEFAULTS = {
	url : "kafka://localhost:9092",
	offset : OFFSET.latest,
	topics : "test",
	format : "raw",
	group : "nsyslog",
	watch : false,
	tls : TLS.DEFAULT
}

const STATUS = {
	active : "active",
	paused : "paused"
}

class KafkaInput extends Input {
	constructor(id,type) {
		super(id,type);
		this.queue = null;
		this.status = STATUS.paused;
	}

	async configure(config,callback) {
		config = config || {};
		this.url = config.url || DEFAULTS.url;
		this.offset = OFFSET[config.offset] || DEFAULTS.offset;
		this.topics = config.topics || DEFAULTS.topics;
		this.format = FORMAT[config.format] || FORMAT.raw;
		this.group = config.group || DEFAULTS.group;
		this.watch = config.watch || DEFAULTS.watch;
		this.tlsopts = extend({},DEFAULTS.tls,config.tls);
		this.paused = false;

		let urls = (Array.isArray(config.url)? config.url : [config.url]);
		this.istls = urls.reduce((ret,url)=>ret||url.startsWith("kafkas"),false);
		if(this.istls) {
			this.tlsopts = await TLS.configure(this.tlsopts);
		}

		callback();
	}

	get mode() {
		return Input.MODE.pull;
	}

	startIval() {
		let i = 0;
		this.ival = setInterval(()=>{
			i++;
			let size = this.queue.size();
			this.consumer.commit(()=>{});

			if(size>MAX_BUFFER && this.status==STATUS.active) {
				logger.debug(`Kafka consumer ${this.id} paused (size: ${size})`);
				this.status = STATUS.pause;
				this.consumer.pause();
			}
			else if(size < MAX_BUFFER/2 && this.status==STATUS.pause) {
				logger.debug(`Kafka consumer ${this.id} resumed  (size: ${size})`);
				this.status = STATUS.active;
				this.consumer.resume();
			}

			if((i%5==0) && this.watch) {
				this.consumer.client.refreshBrokerMetadata(()=>{
					let newTopics = this.findTopics(this.consumer.client);
					newTopics = newTopics.filter(t=>!this.topicmap[t]);
					newTopics.forEach(t=>this.topicmap[t]=t);
					if(newTopics.length) {
						logger.info("Found new kafka topics: ",newTopics);
						this.consumer.addTopics(newTopics, (err,added)=>{
							if(err) logger.error(err);
							else logger.info("Topics added successfuly");
						});
					}
				});
			}
		},1000);
	}

	findTopics(client) {
		let patterns = (Array.isArray(this.topics)? this.topics : [this.topics]);
		let md = client.topicMetadata;
		let topics = [];
		patterns.forEach(pattern=>{
			if(pattern.startsWith('/')) {
				let regex = new RegExp(pattern.replace(/(^\/)|(\/$)/g,''));
				let ptopics = Object.keys(md).filter(k=>regex.test(k));
				ptopics.forEach(topic=>topics.push(topic));
			}
			else topics.push(pattern);
		});
		if(!topics.length) topics = ['__test__'];
		return topics;
	}

	async start(callback) {
		logger.info('Start input on kafka endpoint', this.url);

		this.queue = new Queue();

		let hosts = (Array.isArray(this.url)? this.url : [this.url]).
			map(url=>URL.parse(url)).
			map(url=>`${url.hostname||'localhost'}:${url.port||9092}`).
			join(",");

		const	KAFKA_OPTIONS = {
			kafkaHost: hosts,
			ssl: this.istls,
			groupId: this.group,
			sessionTimeout: 15000,
			protocol: ['roundrobin'],
			fromOffset: this.offset,
			outOfRangeOffset: 'earliest', // default
			migrateHLC: false,    // for details please see Migration section below
			migrateRolling: true
		};

		if(this.istls) {
			KAFKA_OPTIONS.sslOptions = this.tlsopts;
		}
		
		let topics = [];
		try {
			let opts = {kafkaHost:hosts, requestTimeout:10000};
			if(this.istls) opts.sslOptions = this.tlsopts;

			this.client = new kafka.KafkaClient(opts);
			await new Promise((ok,rej)=>{
				this.client.on('ready',ok);
				this.client.on('error',rej);
			});
			topics = this.findTopics(this.client);
			if(!topics.length) topics = ['__test__'];
			this.client.close(()=>{});
		}catch(err) {
			return callback(err);
		}

		try {
			logger.info(`Added kafka topics ${topics.join(", ")}`);
			this.topicmap = topics.reduce((map,k)=>{map[k]=k; return map},{});
			this.consumer = await new ConsumerGroup(KAFKA_OPTIONS,topics);
			this.consumer.on("message",msg=>{
				msg = {
					topic : msg.topic,
					originalMessage : this.format==FORMAT.json?
						JSON.parse(msg.value) : msg.value
				}
				this.queue.push(msg);
			});

			this.consumer.on('error',err=>{
				logger.error(err);
			});

			this.startIval();
			callback();
		}catch(err) {
			callback(err);
		}
	}

	next(callback) {
		this.queue.pop(callback);
	}

	stop(callback) {
		this.status = STATUS.paused;
		clearInterval(this.ival);
		this.consumer.close(true, callback);
	}

	pause(callback) {
		clearInterval(this.ival);
		this.status = STATUS.paused;
		this.consumer.pause();
		callback();
	}

	resume(callback) {
		this.startIval();
		this.status = STATUS.active;
		this.consumer.resume();
		callback();
	}
}

module.exports = KafkaInput;
