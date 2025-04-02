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

const	KAFKA_OPTIONS = {
	sessionTimeout: 15000,
	requestTimeout: 10000,
	protocol: ['roundrobin'],
	outOfRangeOffset: 'earliest', // default
	migrateHLC: false,    // for details please see Migration section below
	migrateRolling: true
};

const OFFSET = {
	latest : "latest",
	earliest : "earliest",
};

const FORMAT = {
	raw : "raw",
	json : "json"
};

const DEFAULTS = {
	url : "kafka://localhost:9092",
	offset : OFFSET.latest,
	topics : "test",
	format : "raw",
	group : "nsyslog",
	watch : false,
	tls : TLS.DEFAULT
};

const STATUS = {
	active : "active",
	paused : "paused"
};

/**
 * KafkaInput class provides functionality to consume messages from Kafka topics.
 * It supports configuration, connection management, and message processing.
 */
class KafkaInput extends Input {
	/**
	 * Creates an instance of KafkaInput.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id,type) {
		super(id,type);
		this.queue = null;
		this.status = STATUS.active;
		this.connected = false;
	}

	/**
	 * Configures the Kafka input with the provided settings.
	 * 
	 * @param {Object} config - Configuration object.
	 * @param {string|string[]} [config.url="kafka://localhost:9092"] - Kafka broker URLs. Can be a single URL or an array of URLs.
	 * @param {string} [config.offset="latest"] - Offset to start consuming messages. Valid values: "latest", "earliest".
	 * @param {string|string[]} [config.topics="test"] - Kafka topics to consume. Can be a single topic or an array of topics.
	 * @param {string} [config.format="raw"] - Message format. Valid values: "raw", "json".
	 * @param {string} [config.group="nsyslog"] - Consumer group ID.
	 * @param {boolean} [config.watch=false] - Whether to watch for new topics dynamically.
	 * @param {Object} [config.tls] - TLS configuration options.
	 * @param {boolean} [config.debug=false] - Enable debug logging.
	 * @param {Object} [config.options] - Additional Kafka client options.
	 * @param {string} [config.$path] - Path for resolving TLS configuration files.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config,callback) {
		config = extend({},DEFAULTS,config || {});

		this.url = (Array.isArray(config.url)? config.url : [config.url]);
		this.offset = OFFSET[config.offset] || DEFAULTS.offset;
		this.topics = config.topics || DEFAULTS.topics;
		this.format = FORMAT[config.format] || FORMAT.raw;
		this.group = config.group || DEFAULTS.group;
		this.watch = config.watch || DEFAULTS.watch;
		this.tlsopts = extend({},DEFAULTS.tls,config.tls);
		this.options = extend({},KAFKA_OPTIONS,config.options);
		this.paused = false;
		this.istls = this.url.reduce((ret,url)=>ret||url.startsWith("kafkas"),false);
		this.msgcount = 0;
		this.debug = config.debug || false;
		this.consumerId = `${this.id}_${process.pid}`;

		if(this.istls) {
			this.tlsopts = await TLS.configure(this.tlsopts,config.$path);
		}

		callback();
	}

	/**
	 * Gets the mode of the input.
	 * @returns {string} The mode of the input.
	 */
	get mode() {
		return Input.MODE.pull;
	}

	/**
	 * Retrieves the watermarks (offsets) for the Kafka topics.
	 * @returns {Promise<Object[]>} Resolves with an array of watermark objects.
	 */
	async watermarks() {
		let cg = this.consumer;

		let topics = this.findTopics(cg.client);
		let offset = new kafka.Offset(cg.client);
		let offsets = await new Promise(ok=>{
			offset.fetchLatestOffsets(topics,(err,offsets)=>ok(offsets));
		});

		return cg.topicPayloads.map(p=>{
			return {
				key : `${this.id}:${this.type}@${p.topic}:${p.partition}`,
				current : p.offset,
				long : offsets[p.topic][p.partition]
			};
		});
	}

	/**
	 * Establishes a connection to the Kafka server and sets up consumers.
	 * @returns {Promise<void>} Resolves when the connection is established.
	 */
	async connect() {
		// Get broker list
		let hosts = this.url.
			map(url=>URL.parse(url)).
			map(url=>`${url.hostname||'localhost'}:${url.port||9092}`).
			join(",");

		// Kafka connection options
		let coptions = extend(
			{}, KAFKA_OPTIONS, {
				fromOffset: this.offset,
				kafkaHost: hosts,
				ssl: this.istls,
				groupId: this.group,
				id: this.consumerId
			},
			this.options,
			this.istls? {sslOptions:this.tlsopts} : {}
		);

		let opts = extend(
			{}, {kafkaHost: hosts, requestTimeout: 10000},
			this.istls? {sslOptions:this.tlsopts} : {}
		);

		let topics = [];
		this.client = new KafkaClient(opts);
		logger.info(`${this.id}: Connecting to kafka`,hosts);
		await new Promise((ok,rej)=>{
			this.client.on('ready',ok);
			this.client.on('error',rej);
		});
		this.client.removeAllListeners('error');
		topics = this.findTopics(this.client);
		if(!topics.length) topics = ['__test__'];
		this.client.close(()=>{});

		logger.info(`${this.id}: Added kafka topics ${topics.join(", ")}`);
		this.topicmap = topics.reduce((map,k)=>{map[k]=k; return map;},{});

		async function getConsumer() {
			let i = 2;
			this.consumer = await new ConsumerGroup(coptions,topics);
			this.consumer.on("message",msg=>{
				this.msgcount++;
				try {
					msg = {
						topic : msg.topic,
						partition : msg.partition,
						originalMessage : this.format==FORMAT.json?
						JSON.parse(msg.value) : msg.value
					};
					this.queue.push(msg);
				}catch(err) {
					logger.error(err);
				}
			});
	
			this.consumer.on('error',err=>{
				logger.error(err);
				logger.error(`${this.id}: Error on kafka connection. Reconnecting...`);
				i--;
				if(i<=0) {
					logger.error(`${this.id}: Not recoverable kafka connection. Restarting...`);
					this.consumer.removeAllListeners("message");
					this.consumer.removeAllListeners('error');
					this.consumer.on('error',()=>{});
					this.consumer.close(()=>{});
					clearTimeout(this.ival);
					setTimeout(()=>{
						getConsumer.apply(this);
						logger.info(`${this.id}: Starting kafka metadata refresh`);
						this.startIval();
					},1000);
				}
			});
		}

		await getConsumer.apply(this);
		logger.info(`${this.id}: Starting kafka metadata refresh`);
		this.startIval();
	}

	/**
	 * Starts the interval for refreshing Kafka metadata and managing consumer state.
	 */
	startIval() {
		let i = 0;
		let fn = ()=>{
			i++;
			if(this.debug)
				logger.info(`${this.id}: Consumed kafka messages: ${this.msgcount} (Status: ${this.status})`);
			let size = this.queue.size();

			try {
				logger.debug(`${this.id}: Refreshing kafka topics metadata`);
				this.consumer.commit(()=>{
					logger.debug(`${this.id}: Consumer commit (${this.status})`);
				});
	
				if(size>MAX_BUFFER && this.status==STATUS.active) {
					logger.debug(`${this.id}: Kafka consumer ${this.id} paused (size: ${size})`);
					this.status = STATUS.paused;
					this.consumer.pause();
				}
				else if(size < MAX_BUFFER/2 && this.status==STATUS.paused) {
					logger.debug(`${this.id}: Kafka consumer ${this.id} resumed  (size: ${size})`);
					this.status = STATUS.active;
					this.consumer.resume();
				}
			}catch(err) {
				logger.error(err);
			}

			if((i%5==0) && this.watch) {
				this.consumer.client.refreshBrokerMetadata((err)=>{
					try {
						if(err) {
							return logger.error(`${this.id}: Error refreshing topics`,err);
						}
	
						let newTopics = this.findTopics(this.consumer.client);
						newTopics = newTopics.filter(t=>!this.topicmap[t]);
						newTopics.forEach(t=>this.topicmap[t]=t);
						if(newTopics.length) {
							logger.info(`${this.id}: Found new kafka topics: `,newTopics);
							this.consumer.addTopics(newTopics, (err,added)=>{
								if(err) logger.error(err);
								else logger.info(`${this.id}: Topics added successfuly`);
							});
						}
					}catch(err) {
						logger.error(err);
					}
					this.ival = setTimeout(()=>fn(),1000);
				});
			}
			else {
				this.ival = setTimeout(()=>fn(),1000);
			}
		};

		this.ival = setTimeout(()=>fn(),1000);
	}

	/**
	 * Finds Kafka topics based on the configured patterns.
	 * @param {Object} client - Kafka client instance.
	 * @returns {string[]} List of matching topics.
	 */
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

	/**
	 * Starts the Kafka input and begins consuming messages.
	 * @param {Function} callback - Callback function to process messages.
	 */
	async start(callback) {
		logger.info(`${this.id}: Start input on kafka endpoint`, this.url);

		this.queue = new Queue();

		var reconnect = async()=>{
			try {
				await this.connect();
				logger.info(`${this.id}: Kafka connection successfuly`,this.url);
			}catch(err) {
				logger.error(err);
				logger.error(`${this.id}: Error on kafka connection. Reconnecting...`);
				setTimeout(reconnect,2000);
			}
		};

		reconnect();
		callback();
	}

	/**
	 * Retrieves the next message from the queue.
	 * @param {Function} callback - Callback function to process the next message.
	 */
	next(callback) {
		this.queue.pop(callback);
	}

	/**
	 * Stops the Kafka input and performs cleanup.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		this.status = STATUS.paused;
		clearTimeout(this.ival);
		if(this.consumer)
			this.consumer.close(true, callback);
		else
			callback();
	}

	/**
	 * Pauses the Kafka input by halting message consumption.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		clearTimeout(this.ival);
		this.status = STATUS.paused;
		if(this.consumer)
			this.consumer.pause();
		callback();
	}

	/**
	 * Resumes the Kafka input by restarting message consumption.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		this.startIval();
		this.status = STATUS.active;
		if(this.consumer)
			this.consumer.resume();
		callback();
	}

	/**
	 * Generates a unique key for a Kafka message entry.
	 * @param {Object} entry - Kafka message entry.
	 * @returns {string} Unique key for the entry.
	 */
	key(entry) {
		return `${entry.input}:${entry.type}@${entry.topic}:${entry.partition}`;
	}
}

module.exports = KafkaInput;
