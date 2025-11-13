const
	Transporter = require("./"),
	extend = require("extend"),
	jsexpr = require("jsexpr"),
	logger = require("../logger"),
	WebSocket = require('ws');

const DEF_CONF = {
	url: "ws://localhost:8080",
	format: "${originalMessage}",
	reconnect: {
		enabled: true,
		delay: 5000,
		maxRetries: 10
	},
	options: {}
};

/**
 * WebSocketTransporter is a transporter for sending log messages via WebSockets.
 * Supports dynamic destinations based on entry data.
 * 
 * @extends Transporter
 */
class WebSocketTransporter extends Transporter {
	/**
	 * Creates an instance of WebSocketTransporter.
	 * 
	 * @param {string} id - The unique identifier for the transporter.
	 * @param {string} type - The type of the transporter.
	 */
	constructor(id, type) {
		super(id, type);
		this.config = {};
		this.connections = new Map();
		this.reconnectTimers = new Map();
	}

	/**
	 * Configures the transporter with the provided settings.
	 * 
	 * @param {Object} config - Configuration object for the transporter.
	 * @param {string} [config.url="ws://localhost:8080"] - The WebSocket URL template.
	 * @param {string} [config.format="${originalMessage}"] - The format of the log message.
	 * @param {Object} [config.reconnect] - Reconnection settings.
	 * @param {boolean} [config.reconnect.enabled=true] - Whether to enable auto-reconnection.
	 * @param {number} [config.reconnect.delay=5000] - Delay between reconnection attempts.
	 * @param {number} [config.reconnect.maxRetries=10] - Maximum number of reconnection attempts.
	 * @param {Object} [config.options={}] - Additional WebSocket options.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	configure(config, callback) {
		this.config = extend(true, {}, DEF_CONF, config);
		this.url = jsexpr.expr(this.config.url);
		this.msg = jsexpr.expr(this.config.format);
		this.wsOptions = jsexpr.expr(this.config.options || {});
		callback();
	}

	/**
	 * Starts the transporter.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	start(callback) {
		callback();
	}

	/**
	 * Resumes the transporter.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		callback();
	}

	/**
	 * Pauses the transporter.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		callback();
	}

	/**
	 * Closes the transporter and all WebSocket connections.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async close(callback) {
		// Clear all reconnection timers
		for (let timer of this.reconnectTimers.values()) {
			clearTimeout(timer);
		}
		this.reconnectTimers.clear();

		// Close all WebSocket connections
		for (let [url, wsData] of this.connections) {
			try {
				if (wsData.ws && wsData.ws.readyState === WebSocket.OPEN) {
					wsData.ws.close();
				}
			} catch (err) {
				logger.error(`${this.id}: Error closing WebSocket ${url}:`, err);
			}
		}
		this.connections.clear();
		callback();
	}

	/**
	 * Creates and manages a WebSocket connection for a specific URL.
	 * 
	 * @param {string} url - The WebSocket URL to connect to.
	 * @param {Object} entry - The log entry (for context).
	 * @returns {Promise<WebSocket>} - Promise that resolves to the WebSocket connection.
	 */
	async createConnection(url, entry) {
		return new Promise((resolve, reject) => {
			const options = extend(true, {}, this.wsOptions(entry));
			const ws = new WebSocket(url, options);
			
			const wsData = {
				ws: ws,
				url: url,
				retryCount: 0,
				connected: false
			};

			ws.on('open', () => {
				logger.silly(`${this.id}: WebSocket connected to ${url}`);
				wsData.connected = true;
				wsData.retryCount = 0;
				
				// Clear any existing reconnection timer
				const timer = this.reconnectTimers.get(url);
				if (timer) {
					clearTimeout(timer);
					this.reconnectTimers.delete(url);
				}
				
				resolve(ws);
			});

			ws.on('error', (err) => {
				logger.error(`${this.id}: WebSocket error for ${url}:`, err);
				if (!wsData.connected) {
					reject(err);
				}
			});

			ws.on('close', () => {
				logger.silly(`${this.id}: WebSocket closed for ${url}`);
				wsData.connected = false;
				
				// Attempt reconnection if enabled
				if (this.config.reconnect.enabled && wsData.retryCount < this.config.reconnect.maxRetries) {
					this.scheduleReconnection(url, wsData);
				} else {
					this.connections.delete(url);
				}
			});

			this.connections.set(url, wsData);
		});
	}

	/**
	 * Schedules a reconnection attempt for a WebSocket.
	 * 
	 * @param {string} url - The WebSocket URL to reconnect to.
	 * @param {Object} wsData - The WebSocket data object.
	 */
	scheduleReconnection(url, wsData) {
		wsData.retryCount++;
		logger.debug(`${this.id}: Scheduling reconnection attempt ${wsData.retryCount} for ${url}`);
		
		const timer = setTimeout(async () => {
			try {
				this.reconnectTimers.delete(url);
				await this.createConnection(url, {});
				logger.info(`${this.id}: Successfully reconnected to ${url}`);
			} catch (err) {
				logger.error(`${this.id}: Reconnection failed for ${url}:`, err);
			}
		}, this.config.reconnect.delay);
		
		this.reconnectTimers.set(url, timer);
	}

	/**
	 * Gets or creates a WebSocket connection for the specified URL.
	 * 
	 * @param {string} url - The WebSocket URL.
	 * @param {Object} entry - The log entry.
	 * @returns {Promise<WebSocket|null>} - Promise that resolves to the WebSocket connection or null if unavailable.
	 */
	async getConnection(url, entry) {
		let wsData = this.connections.get(url);
		
		if (!wsData) {
			try {
				await this.createConnection(url, entry);
				wsData = this.connections.get(url);
			} catch (err) {
				logger.error(`${this.id}: Failed to create WebSocket connection to ${url}:`, err);
				return null;
			}
		}

		if (wsData && wsData.ws && wsData.ws.readyState === WebSocket.OPEN) {
			return wsData.ws;
		}

		return null;
	}

	/**
	 * Transports a log entry via WebSocket.
	 * 
	 * @param {Object} entry - The log entry to be transported.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async transport(entry, callback) {
		try {
			const url = this.url(entry);
			const message = this.msg(entry);
			
			const ws = await this.getConnection(url, entry);
			
			if (!ws) {
				return callback(new Error(`WebSocket connection not available for ${url}`));
			}

			const data = typeof message === 'string' ? message : JSON.stringify(message);
			
			ws.send(data, (err) => {
				if (err) {
					logger.error(`${this.id}: Failed to send message to ${url}:`, err);
				} else {
					logger.silly(`${this.id}: Message sent to ${url}`);
				}
				callback(err);
			});

		} catch (err) {
			logger.error(`${this.id}: Transport error:`, err);
			callback(err);
		}
	}
}

module.exports = WebSocketTransporter;
