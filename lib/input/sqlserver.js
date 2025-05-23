const
	logger = require('../logger'),
	Input = require('.'),
	extend = require('extend'),
	jsexpr = require('jsexpr'),
	Semaphore = require('../semaphore'),
	Watermark = require("../watermark"),
	{timer} = require('../util'),
	Queue = require('../queue'),
	sql = require('mssql/msnodesqlv8');

const IVAL_WM = 2000; // Interval for watermark updates in milliseconds
const MAX_BUFF = 5000; // Maximum buffer size for the queue
const DEFAULTS = {
	query: 'select 1 as number', // Default SQL query
	mode: 'watermark', // Default mode for watermark handling
	options: {
		server: 'localhost', // Default SQL Server
		pool: {
			max: 10,
			min: 0,
			idleTimeoutMillis: 30000
		},
		options: {
			encrypt: false, // For Azure
			trustServerCertificate: true // For local dev/self-signed certs
		}
	}
};

/**
 * SQLServerInput class for handling SQL Server-based input.
 * Extends the base Input class.
 */
class SQLServerInput extends Input {
	/**
	 * Constructor for SQLServerInput.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);

		this.wmival = null; // Watermark interval timer
		this.connected = null; // Connection status
		this.queue = new Queue(MAX_BUFF); // Queue for storing fetched rows
		this.cwm = null; // Current watermark
		this.req = null; // Current SQL request
	}

	/**
	 * Configures the SQLServerInput with the provided settings.
	 * 
	 * @param {Object} config - Configuration object containing:
	 * @param {string} [config.query="select 1 as number"] - SQL query to execute.
	 * @param {string} [config.mode="watermark"] - Mode for watermark handling.
	 * @param {Object} [config.options] - SQL Server connection options.
	 * @param {Object} [config.watermark] - Initial watermark configuration.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config, callback) {
		this.config = config = extend(true, {}, DEFAULTS, config || {});
		this.options = config.options || DEFAULTS.options;
		this.query = jsexpr.expr(config.query || DEFAULTS.query);
		this.sem = new Semaphore(config.maxCursors || DEFAULTS.maxCursors);
		this.wmmode = this.config.mode;

		this.watermark = new Watermark(config.$datadir);
		await this.watermark.start();
		this.wm = await this.watermark.get(this.id);

		if (this.wmmode == 'start' || !this.wm.last) {
			this.wm.last = config.watermark || DEFAULTS.watermark;
		}

		if (callback) callback();
	}

	/**
	 * Returns the mode of the input.
	 * @returns {string} The mode of the input (pull).
	 */
	get mode() {
		return Input.MODE.pull;
	}

	/**
	 * Fetches data from the SQL Server using the configured query.
	 * 
	 * @param {number} [time] - Time to wait before fetching data.
	 * @returns {Promise<void>}
	 */
	async fetchData(time) {
		if (time && !this.sem.available())
			return await timer(time);

		await this.sem.take();

		let query = this.query(this.wm.last);
		let req = this.req = await this.server.request();
		req.stream = true;

		req.on('row', row => {
			logger.silly(`${this.id} row fetch:`, row);
			this.wm.last = row;
			this.queue.push(row);
		});

		req.on('done', async () => {
			logger.silly(`${this.id} Query completed`);
			await this.saveWatermark();
			this.sem.leave();
		});

		req.on('error', async (err) => {
			logger.error(`${this.id} Query error`, err);
			await this.saveWatermark();
			this.sem.leave();
		});

		req.query(query);
		logger.silly(`${this.id}: Query: ${query}`);
	}

	/**
	 * Saves the current watermark state to persistent storage.
	 * @returns {Promise<void>}
	 */
	async saveWatermark() {
		try {
			await this.watermark.save(this.wm);
			logger.silly(`${this.id}: Watermark saved`);
		} catch (err) {
			logger.error(err);
		}
	}

	/**
	 * Establishes a connection to the SQL Server.
	 * Reconnects automatically if the connection is lost.
	 * @returns {Promise<void>}
	 */
	async connect() {
		let connected = false;

		while (!connected) {
			try {
				this.server = await sql.connect(this.options);
				this.server.on('error', () => logger.warn(`${this.id}: SQLServer Error: `, this.options));
				connected = true;
			} catch (err) {
				logger.error(`${this.id}: Cannot establish connection to SQLServer:`, this.options);
				logger.error(err);
				await timer(2000);
			}
		}
	}

	/**
	 * Starts the SQLServerInput and establishes a connection to the SQL Server.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async start(callback) {
		this.connected = this.connect();

		this.ival = setInterval(() => {
			try {
				if (this.queue.size() >= MAX_BUFF && !this.req.paused) {
					logger.warn(`${this.id} : Query paused!`);
					this.req.pause();
				} else if (this.queue.size() < MAX_BUFF / 2 && this.req.paused) {
					logger.warn(`${this.id} : Query resumed!`);
					this.req.resume();
				}
			} catch (err) { }
		});

		if (callback) callback();
	}

	/**
	 * Retrieves the next item from the SQL Server query results.
	 * 
	 * @param {Function} callback - Callback function to process the next item.
	 */
	async next(callback) {
		await this.connected;

		while (!this.queue.size()) {
			// Perform query or wait if query is already running
			await this.fetchData(1000);

			// Wait while query is executing or no data is provided
			while (!this.sem.available() && !this.queue.size()) {
				logger.silly(`${this.id} : Waiting to have results`);
				await timer(100);
			}
		}

		// Take one element
		let data = await this.queue.pop();

		// Return data
		if (callback) {
			callback(null, {
				id: this.id,
				type: this.type,
				database: this.options.database,
				originalMessage: data
			});
		}
	}

	/**
	 * Stops the SQLServerInput and performs cleanup.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async stop(callback) {
		if (callback) callback();
	}

	/**
	 * Pauses the SQLServerInput.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async pause(callback) {
		if (callback) callback();
	}

	/**
	 * Resumes the SQLServerInput.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async resume(callback) {
		if (callback) callback();
	}

	/**
	 * Generates a unique key for the input entry.
	 * 
	 * @param {Object} entry - Input entry object.
	 * @returns {string} Unique key for the entry.
	 */
	key(entry) {
		return `${entry.input}:${entry.type}@${entry.database}`;
	}
}

if (module.parent) {
	module.exports = SQLServerInput;
} else {
	logger.setLevel('debug');

	/*
	async function test()  {
		const config = {
			query : 'select TOP (1000) [Index],[Height_Inches],[Weight_Pounds] from hw_25000 where [Index] > ${Index}',
			watermark : {Index:0},
			mode : 'watermark',
			options : {
			  //domain : "GRUPOICA",
			  user: "david.gomez",
			  password: "",
			  database: "LogsDB",
			  server: 'GICA-MAD-671',
			  pool: {
				max: 10,
				min: 0,
				idleTimeoutMillis: 30000
			  },
			  options: {
				trustedConnection: true,			  
				encrypt: false, // for azure
				trustServerCertificate: true // change to true for local dev / self-signed certs
			  }
			}	
		}

		let input = new SQLServerInput('sqlserver','sqlsever');
		await input.configure(config);
		await input.start();
		while(true) {
			await input.next((err,entry)=>{
				console.log(entry);
			});
		}
	}

	test();
*/

async function test()  {
	const sqlConfig = {
	//domain : "GRUPOICA", 
		user: "david.gomez",
		password: "",
		database: "LogsDB",
		server: 'GICA-MAD-671',
		pool: {
			max: 10,
			min: 0,
			idleTimeoutMillis: 30000
		},
		options: {
			trustedConnection: true,			  
			encrypt: false, // for azure
			trustServerCertificate: true // change to true for local dev / self-signed certs
		}
	}	

	try {
		let pool = await sql.connect(sqlConfig);
		
		let mreq = await pool.request();
		let max = await mreq.query('SELECT MAX([Index]) as WM from hw_25000');
		let idx =  max.recordset[0].WM;

		for(let i=0;i<1000;i++) {
			idx++;
			let v1 = Math.floor(Math.random()*10000);
			let v2 = Math.floor(Math.random()*10000);
			let req = await pool.request();
			await req.query(`insert into hw_25000 ([Index],Height_Inches,Weight_Pounds) values (${idx},${v1},${v2})`);
			process.stdout.write('.');
			await timer(300);
		}
		console.log('DONE');
		process.exit(0);
	}catch(err) {
		console.error(err);
	}
}

test();

/*
	async function test()  {
		const sqlConfig = {
		//domain : "GRUPOICA", 
		user: "david.gomez",
		password: "",
		database: "LogsDB",
		server: 'GICA-MAD-671',
		pool: {
			max: 10,
			min: 0,
			idleTimeoutMillis: 30000
		},
		options: {
			trustedConnection: true,			  
			encrypt: false, // for azure
			trustServerCertificate: true // change to true for local dev / self-signed certs
		}
		}	

		try {
			let pool = await sql.connect(sqlConfig);
			let req = await pool.request();
			req.stream = true;
			req.on('row', row => {
				console.log('ROW',row);
			});

			req.query('select * from hw_25000');
		}catch(err) {
			console.error(err);
		}
	}

	test();
*/
	/*
	let input = new SQLServerInput("mongo","mongo");
	logger.setLevel('debug');
	input.configure({
		$datadir:'/tmp/nsyslog',
		url : 'mongodb://localhost/logicalog',
		query : {line:{$gt:'${line}'}},
		watermark : {line:0},
		maxCursors : 10
	},()=>{
		input.start(()=>{
			function next() {
				input.next((err,item)=>{
					if(err) {
						logger.error(err);
						process.exit(1);
					}
					else {
						logger.debug(item);
						setImmediate(next,1000);
					}
				});
			}
			next();
		});
	});
	*/
}
