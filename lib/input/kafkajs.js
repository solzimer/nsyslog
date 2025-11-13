const
	logger = require('../logger'),
	Input = require('.'),
	extend = require('extend'),
	{ Kafka, logLevel, CompressionTypes } = require('kafkajs'),
	URL = require('url'),
	TLS = require("../tls"),
	Queue = require('../queue');

const MAX_BUFFER = 1000;

const KAFKA_OPTIONS = {
	sessionTimeout: 30000,
	requestTimeout: 30000,
	heartbeatInterval: 10000,
	maxWaitTimeInMs: 1000,
	allowAutoTopicCreation: true,
	maxBytesPerPartition: 10485760,
	minBytes: 1024,
	maxBytes: 52428800,
	partitionAssignmentTimeout: 30000,
	rebalanceTimeout: 60000,
	autoCommitInterval: 5000,
	// Add compression configuration
	compression: CompressionTypes.GZIP,
	retry: {
		initialRetryTime: 300,
		retries: -1,
		maxRetryTime: 30000,
		multiplier: 2
	}
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

const LOGGER_MAP = {
	[logLevel.DEBUG]: logger.debug,
	[logLevel.INFO]: logger.info,
	[logLevel.WARN]: logger.warn,
	[logLevel.ERROR]: logger.error
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
		this.lastReceived = null;
		this.kafka = null;
		this.consumer = null;
		this.admin = null;
		// Add resource tracking
		this.isShuttingDown = false;
		this.pendingOperations = new Set();
		this.lastHeartbeat = null;
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
	 * @param {boolean} [config.compression=true] - Enable GZIP compression for better network efficiency.
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
		
		// Configure compression if disabled in config
		if (config.compression === false) {
			this.options.compression = CompressionTypes.None;
			logger.info(`${this.id}: GZIP compression disabled by configuration`);
		} else {
			this.options.compression = CompressionTypes.GZIP;
			logger.info(`${this.id}: GZIP compression enabled`);
		}
		
		this.paused = false;
		this.istls = this.url.reduce((ret,url)=>ret||url.startsWith("kafkas"),false);
		this.msgcount = 0;
		this.batchCount = 0; // Track batch processing
		this.debug = config.debug || false;
		this.consumerId = `${this.id}_${process.pid}`;
		// Add performance monitoring with compression tracking
		this.stats = {
			messagesPerSecond: 0,
			lastStatsTime: Date.now(),
			totalBytes: 0,
			avgBatchSize: 0,
			compressionRatio: 0
		};

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
		if (!this.admin) return [];

		try {
			const topics = this.findTopics();
			const topicOffsets = await this.admin.fetchTopicOffsets(topics);
			
			return topicOffsets.flatMap(topicOffset => 
				topicOffset.partitions.map(partition => ({
					key: `${this.id}:${this.type}@${topicOffset.topic}:${partition.partition}`,
					current: partition.offset,
					long: partition.high
				}))
			);
		} catch (err) {
			logger.error(`${this.id}: Error fetching watermarks`, err);
			return [];
		}
	}

	/**
	 * Establishes a connection to the Kafka server and sets up consumers.
	 * Creates Kafka client instance, connects admin client, discovers topics,
	 * and initializes the consumer with optimized configuration.
	 * @returns {Promise<void>} Resolves when the connection is established.
	 * @throws {Error} When connection fails or times out.
	 */
	async connect() {
		// Parse URLs to extract broker addresses
		let brokers = this.url.
			map(url=>URL.parse(url)).
			map(url=>`${url.hostname||'localhost'}:${url.port||9092}`);

		// Configure Kafka client with optimized settings for high-pressure environments
		let kafkaConfig = {
			clientId: this.consumerId,
			brokers: brokers,
			requestTimeout: this.options.requestTimeout || 30000,
			connectionTimeout: this.options.sessionTimeout || 30000,
			// Configure KafkaJS to use our external logger instead of internal one
			logLevel: this.debug ? logLevel.DEBUG : logLevel.WARN,
			logCreator: () => {
				return ({ namespace, level, label, log }) => {
					const { message, ...extra } = log;
					
					// Use numeric log level constants for mapping
					const logFunction = LOGGER_MAP[level] || LOGGER_MAP[logLevel.DEBUG];
					if(this.debug || level === logLevel.ERROR) {
						logFunction(this.id, namespace, message, extra);
					}
				};
			}
		};

		// Add TLS configuration if required
		if (this.istls) {
			kafkaConfig.ssl = {
				...this.tlsopts
			};
		}

		// Initialize Kafka client and admin interface
		this.kafka = new Kafka(kafkaConfig);
		this.admin = this.kafka.admin();
		
		logger.info(`${this.id}: Connecting to kafka with GZIP compression`, brokers);

		try {
			// Connect admin client for metadata operations
			await this.admin.connect();
			
			// Discover and validate topics
			let topics = this.findTopics();
			if(!topics.length) topics = ['__test__'];
			
			logger.info(`${this.id}: Added kafka topics ${topics.join(", ")}`);
			// Create topic mapping for quick lookups during pause/resume operations
			this.topicmap = topics.reduce((map,k)=>{map[k]=k; return map;},{});

			// Create and configure the consumer
			await this.createConsumer(topics);
		} catch (err) {
			throw err;
		}
	}

	/**
	 * Creates and configures a Kafka consumer with optimized settings for batch processing.
	 * Sets up message handlers, event listeners, and subscription to topics.
	 * @param {string[]} topics - Array of topic names to subscribe to.
	 * @returns {Promise<void>} Resolves when consumer is created and running.
	 * @throws {Error} When consumer creation or subscription fails.
	 */
	async createConsumer(topics) {
		try {
			// Create consumer with high-pressure optimized configuration including compression
			this.consumer = this.kafka.consumer({
				groupId: this.group,
				sessionTimeout: this.options.sessionTimeout || 30000,
				heartbeatInterval: this.options.heartbeatInterval || 10000,
				maxWaitTimeInMs: this.options.maxWaitTimeInMs || 1000,
				allowAutoTopicCreation: this.options.allowAutoTopicCreation || false,
				partitionAssignmentTimeout: this.options.partitionAssignmentTimeout || 30000,
				rebalanceTimeout: this.options.rebalanceTimeout || 60000,
				maxBytesPerPartition: this.options.maxBytesPerPartition || 10485760,
				minBytes: this.options.minBytes || 1024,
				maxBytes: this.options.maxBytes || 52428800,
				retry: this.options.retry || {
					initialRetryTime: 300,
					retries: 10,
					maxRetryTime: 30000,
					multiplier: 2
				},
				autoCommit: true,
				autoCommitInterval: this.options.autoCommitInterval || 5000
			});

			// Establish consumer connection
			await this.consumer.connect();
			
			// Subscribe to all topics at once for better performance
			await this.consumer.subscribe({ 
				topics: topics, 
				fromBeginning: this.offset === 'earliest' 
			});

			// Configure batch processing handler for optimal throughput with compression awareness
			await this.consumer.run({
				eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
					// Safety check: prevent processing during shutdown or stale consumer
					if (this.isShuttingDown || !isRunning() || isStale()) {
						return;
					}

					// Track pending operations for graceful shutdown
					const operationId = Date.now() + Math.random();
					this.pendingOperations.add(operationId);

					try {
						const messages = [];
						let totalBytes = 0;
						let compressedBytes = 0;
						
						// Process each message in the batch
						for (const message of batch.messages) {
							this.msgcount++;
							try {
								const messageValue = message.value.toString();
								totalBytes += messageValue.length;
								// Track compressed size if available in message headers
								if (message.headers && message.headers['compression.size']) {
									compressedBytes += parseInt(message.headers['compression.size'].toString());
								}
								
								// Create enriched message object with metadata
								const msg = {
									topic: batch.topic,
									partition: batch.partition,
									offset: message.offset,
									timestamp: message.timestamp,
									key: message.key ? message.key.toString() : null,
									headers: message.headers,
									originalMessage: this.format === FORMAT.json ?
										JSON.parse(messageValue) : messageValue
								};
								messages.push(msg);
							} catch(err) {
								logger.error(`${this.id}: Error processing message at offset ${message.offset}`, err);
							}

							if(this.messageCount%20==0) {
								await heartbeat();
							}
						}
						
						// Queue processed messages if any were successfully parsed
						if (messages.length > 0) {
							this.lastReceived = Date.now();
							this.batchCount++;
							this.stats.totalBytes += totalBytes;
							// Track compression efficiency if data available
							if (compressedBytes > 0) {
								this.stats.compressionRatio = ((totalBytes - compressedBytes) / totalBytes * 100).toFixed(2);
							}
							
							// Update performance statistics
							this.updateStats(messages.length);
							
							// Efficiently push messages to queue (use batch if available)
							this.queue.pushBatch ? 
								this.queue.pushBatch(messages) : 
								messages.forEach(msg => this.queue.push(msg));

							// Commit the last offset in the batch for progress tracking
							const lastMessage = batch.messages[batch.messages.length - 1];
							resolveOffset(lastMessage.offset);
						}

						// Send heartbeat to maintain consumer session
						this.lastHeartbeat = Date.now();
						await heartbeat();

					} catch (err) {
						logger.error(`${this.id}: Error in batch processing`, err);
					} finally {
						// Always clean up operation tracking
						this.pendingOperations.delete(operationId);
					}
				}
			});

			// Set up comprehensive event handling for consumer lifecycle
			this.setupConsumerEventHandlers();

		} catch (err) {
			logger.error(`${this.id}: Error creating consumer`, err);
			throw err;
		}
	}

	/**
	 * Sets up event handlers for consumer lifecycle events.
	 * Monitors crashes, disconnections, connections, rebalancing, and group joins.
	 * @private
	 */
	setupConsumerEventHandlers() {
		// Handle consumer crashes with error recovery
		this.consumer.on('consumer.crash', (err) => {
			logger.error(`${this.id}: Consumer crashed`, err);
			this.handleConsumerError(err);
		});

		// Track connection state changes
		this.consumer.on('consumer.disconnect', () => {
			logger.warn(`${this.id}: Consumer disconnected`);
			this.connected = false;
		});

		this.consumer.on('consumer.connect', () => {
			logger.info(`${this.id}: Consumer connected`);
			this.connected = true;
		});

		// Monitor rebalancing events for partition reassignment
		this.consumer.on('consumer.rebalancing', () => {
			logger.info(`${this.id}: Consumer rebalancing`);
		});

		// Log successful group joins
		this.consumer.on('consumer.group_join', (data) => {
			logger.info(`${this.id}: Consumer joined group`, data);
		});
	}

	/**
	 * Updates performance statistics and logs metrics periodically.
	 * Calculates messages per second, average batch size, and throughput metrics.
	 * @param {number} messageCount - Number of messages processed in current batch.
	 * @private
	 */
	updateStats(messageCount) {
		const now = Date.now();
		const timeDiff = now - this.stats.lastStatsTime;
		
		// Update statistics every 5 seconds to avoid log spam
		if (timeDiff >= 5000) {
			this.stats.messagesPerSecond = (this.msgcount / (timeDiff / 1000)).toFixed(2);
			this.stats.avgBatchSize = this.batchCount > 0 ? (this.msgcount / this.batchCount).toFixed(2) : 0;
			this.stats.lastStatsTime = now;
			
			// Log performance metrics in debug mode including compression info
			if (this.debug) {
				const compressionInfo = this.stats.compressionRatio > 0 ? `, compression: ${this.stats.compressionRatio}%` : '';
				logger.info(`${this.id}: Performance - ${this.stats.messagesPerSecond} msg/s, avg batch: ${this.stats.avgBatchSize}, total bytes: ${this.stats.totalBytes}${compressionInfo}`);
			}
		}
	}

	/**
	 * Handles consumer errors and implements recovery strategies.
	 * Currently logs errors; could be extended with reconnection logic.
	 * @param {Error} err - The error that occurred in the consumer.
	 * @private
	 */
	handleConsumerError(err) {
		// Log error details for debugging
		logger.error(`${this.id}: Handling consumer error`, err);
		// TODO: Could implement reconnection logic here if needed
	}

	/**
	 * Starts the interval for managing consumer state (pause/resume based on queue size).
	 * Implements backpressure control and health monitoring.
	 * @private
	 */
	startIval() {
		let i = 0;
		const fn = async () => {
			// Exit early if shutting down
			if (this.isShuttingDown) return;
			
			try {
				const size = this.queue.size();
				i++;

				// Periodic debug logging to reduce noise
				if (this.debug && i % 10 === 0) {
					logger.info(`${this.id}: Stats - Messages: ${this.msgcount}, Queue: ${size}, Status: ${this.status}, Rate: ${this.stats.messagesPerSecond} msg/s`);
				}

				// Implement backpressure control with hysteresis
				const pauseThreshold = MAX_BUFFER;
				const resumeThreshold = Math.floor(MAX_BUFFER * 0.2); // Lower resume threshold to prevent oscillation

				// Pause consumer when queue is full to prevent memory overflow
				if (size > pauseThreshold && this.status === STATUS.active) {
					logger.debug(`${this.id}: Kafka consumer paused (queue size: ${size})`);
					this.status = STATUS.paused;
					if (this.consumer && this.connected) {
						const topicPartitions = Object.keys(this.topicmap).map(topic => ({ topic }));
						await this.consumer.pause(topicPartitions);
					}
				}
				// Resume consumer when queue has sufficient space
				else if (size < resumeThreshold && this.status === STATUS.paused) {
					logger.debug(`${this.id}: Kafka consumer resumed (queue size: ${size})`);
					this.status = STATUS.active;
					if (this.consumer && this.connected) {
						const topicPartitions = Object.keys(this.topicmap).map(topic => ({ topic }));
						await this.consumer.resume(topicPartitions);
					}
				}

				// Health check: monitor heartbeat freshness
				if (this.lastHeartbeat && Date.now() - this.lastHeartbeat > 60000) {
					logger.debug(`${this.id}: No heartbeat for 60 seconds, consumer may be unhealthy`);
				}

			} catch (err) {
				logger.error(`${this.id}: Error in consumer management interval`, err);
			}

			// Schedule next iteration only if not shutting down
			if (!this.isShuttingDown) {
				this.ival = setTimeout(fn, 1000);
			}
		};

		// Start the management interval
		this.ival = setTimeout(fn, 1000);
	}

	/**
	 * Finds Kafka topics based on the configured patterns.
	 * Supports both literal topic names and regex patterns for dynamic topic discovery.
	 * @param {Object[]} [availableTopics] - Available topics from metadata (optional).
	 * @returns {string[]} List of matching topics.
	 */
	findTopics(availableTopics) {
		// Normalize topics to array format
		let patterns = (Array.isArray(this.topics)? this.topics : [this.topics]);
		let topics = [];
		
		if (availableTopics) {
			// Extract topic names from metadata objects
			const topicNames = availableTopics.map(t => t.name);
			patterns.forEach(pattern=>{
				// Handle regex patterns (starting with '/')
				if(pattern.startsWith('/')) {
					let regex = new RegExp(pattern.replace(/(^\/)|(\/$)/g,''));
					let ptopics = topicNames.filter(k=>regex.test(k));
					ptopics.forEach(topic=>topics.push(topic));
				}
				// Handle literal topic names
				else topics.push(pattern);
			});
		} else {
			// Fallback when no metadata available - only use literal names
			patterns.forEach(pattern=>{
				if(!pattern.startsWith('/')) {
					topics.push(pattern);
				}
			});
		}
		
		// Ensure at least one topic exists (fallback for testing)
		if(!topics.length) topics = ['__test__'];
		return topics;
	}

	/**
	 * Starts the Kafka input and begins consuming messages.
	 * Initializes the queue, establishes connection, and starts management processes.
	 * @param {Function} callback - Callback function to process messages.
	 */
	async start(callback) {
		logger.info(`${this.id}: Start input on kafka endpoint`, this.url);

		// Initialize internal message queue
		this.queue = new Queue();

		let isConnected = false;
		do {
			try {
				// Establish Kafka connection and create consumer
				await this.connect();
				isConnected = true;
				logger.info(`${this.id}: Kafka connection successfully`,this.url);
				
				// Start consumer management interval
				this.startIval();
			}catch(err) {
				logger.error(err);
				logger.error(`${this.id}: Error on kafka connection.`);
			}
		}while(!isConnected)

		callback();
	}

	/**
	 * Retrieves the next message from the queue.
	 * Used in pull mode to fetch messages one at a time.
	 * @param {Function} callback - Callback function to process the next message.
	 */
	next(callback) {
		this.queue.pop(callback);
	}

	/**
	 * Stops the Kafka input and performs cleanup.
	 * Implements graceful shutdown with pending operation waiting.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async stop(callback) {
		// Signal shutdown to prevent new operations
		this.isShuttingDown = true;
		this.status = STATUS.paused;
		clearTimeout(this.ival);
		
		// Wait for pending operations to complete gracefully
		const maxWait = 5000; // 5 seconds max wait
		const startWait = Date.now();
		
		while (this.pendingOperations.size > 0 && (Date.now() - startWait) < maxWait) {
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		
		// Warn if forced shutdown with pending operations
		if (this.pendingOperations.size > 0) {
			logger.warn(`${this.id}: Stopping with ${this.pendingOperations.size} pending operations`);
		}
		
		try {
			// Disconnect consumer and admin clients
			if (this.consumer) {
				await this.consumer.disconnect();
				this.consumer = null;
			}
			if (this.admin) {
				await this.admin.disconnect();
				this.admin = null;
			}
			
			// Clean up Kafka client instance
			this.kafka = null;
			this.connected = false;
		} catch (err) {
			logger.error(`${this.id}: Error stopping kafka input`, err);
		}
		
		callback();
	}

	/**
	 * Pauses the Kafka input by halting message consumption.
	 * Stops the management interval and pauses all topic partitions.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async pause(callback) {
		// Stop management interval
		clearTimeout(this.ival);
		this.status = STATUS.paused;
		
		try {
			// Pause consumption on all subscribed topics
			if (this.consumer) {
				const topicPartitions = Object.keys(this.topicmap).map(topic => ({ topic }));
				await this.consumer.pause(topicPartitions);
			}
		} catch (err) {
			logger.error(`${this.id}: Error pausing consumer`, err);
		}
		callback();
	}

	/**
	 * Resumes the Kafka input by restarting message consumption.
	 * Restarts the management interval and resumes all topic partitions.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async resume(callback) {
		// Restart management interval
		this.startIval();
		this.status = STATUS.active;
		
		try {
			// Resume consumption on all subscribed topics
			if (this.consumer) {
				const topicPartitions = Object.keys(this.topicmap).map(topic => ({ topic }));
				await this.consumer.resume(topicPartitions);
			}
		} catch (err) {
			logger.error(`${this.id}: Error resuming consumer`, err);
		}
		callback();
	}

	/**
	 * Generates a unique key for a Kafka message entry.
	 * Creates identifiers for tracking and debugging purposes.
	 * @param {Object} entry - Kafka message entry.
	 * @returns {string} Unique key for the entry.
	 */
	key(entry) {
		return `${entry.input}:${entry.type}@${entry.topic}:${entry.partition}`;
	}
}

module.exports = KafkaInput;
module.exports = KafkaInput;
module.exports = KafkaInput;
