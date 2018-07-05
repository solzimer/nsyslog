const
	logger = require('../logger'),
	Input = require('./'),
	extend = require('extend'),
	kafka = require('kafka-node'),
	URL = require('url'),
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
	group : "nsyslog"
}

const STATUS = {
	active : "active",
	paused : "paused"
}

class KafkaInput extends Input {
	constructor(id) {
		super(id);
		this.queue = null;
		this.status = STATUS.paused;
	}

	configure(config,callback) {
		config = config || {};
		this.url = config.url || DEFAULTS.url;
		this.offset = OFFSET[config.offset] || DEFAULTS.offset;
		this.topics = config.topics || DEFAULTS.topics;
		this.format = FORMAT[config.format] || FORMAT.raw;
		this.group = config.group || DEFAULTS.group;
		this.paused = false;
		callback();
	}

	get mode() {
		return Input.MODE.pull;
	}

	startIval() {
		this.ival = setInterval(()=>{
			let size = this.queue.size();
			this.consumer.commit(()=>{});

			if(size>MAX_BUFFER && this.status==STATUS.active) {
				logger.info(`Kafka consumer paused (size: ${size})`);
				this.status = STATUS.pause;
				this.consumer.pause();
			}
			else if(size < MAX_BUFFER/2 && this.status==STATUS.pause) {
				logger.info(`Kafka consumer resumed  (size: ${size})`);
				this.status = STATUS.active;
				this.consumer.resume();
			}
		},1000);
	}

	async start(callback) {
		logger.info('Start input on kafka endpoint', this.url);

		this.queue = new Queue();

		let patterns = (Array.isArray(this.topics)? this.topics : [this.topics]);
		let topics = [];
		let hosts = (Array.isArray(this.url)? this.url : [this.url]).
			map(url=>URL.parse(url)).
			map(url=>`${url.hostname||'localhost'}:${url.port||9092}`).
			join(",");

		const	KAFKA_OPTIONS = {
			kafkaHost: hosts,
			groupId: this.group,
			sessionTimeout: 15000,
			protocol: ['roundrobin'],
			fromOffset: this.offset,
			outOfRangeOffset: 'earliest', // default
			migrateHLC: false,    // for details please see Migration section below
			migrateRolling: true
		};

		try {
			this.client = new kafka.KafkaClient({kafkaHost:hosts, requestTimeout:10000});
			await new Promise((ok,rej)=>{
				this.client.on('ready',ok);
				this.client.on('error',rej);
			});
			let md = this.client.topicMetadata;
			patterns.forEach(pattern=>{
				if(pattern.startsWith('/')) {
					let regex = new RegExp(pattern.replace(/(^\/)|(\/$)/g,''));
					let ptopics = Object.keys(md).filter(k=>regex.test(k));
					ptopics.forEach(topic=>topics.push(topic));
				}
				else topics.push(pattern);
			});
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
