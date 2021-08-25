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

const IVAL_WM = 2000;
const MAX_BUFF = 5000;
const DEFAULTS = {
	query : 'select 1 as number',
	mode : 'watermark',
	options : {
		server: 'localhost',
		pool: {
		  max: 10,
		  min: 0,
		  idleTimeoutMillis: 30000
		},
		options: {
		  encrypt: false, // for azure
		  trustServerCertificate: true // change to true for local dev / self-signed certs
		}
	}
};

class SQLServerInput extends Input {
	constructor(id,type) {
		super(id,type);

		this.wmival = null;
		this.connected = null;
		this.queue = new Queue(MAX_BUFF);
		this.cwm = null;
		this.req = null;
	}

	async configure(config,callback) {
		this.config = config = extend(true,{},DEFAULTS, config || {});
		this.options = config.options || DEFAULTS.options;
		this.query = jsexpr.expr(config.query || DEFAULTS.query);
		this.sem = new Semaphore(config.maxCursors || DEFAULTS.maxCursors);
		this.wmmode = this.config.mode;

		this.watermark = new Watermark(config.$datadir);
		await this.watermark.start();
		this.wm = await this.watermark.get(this.id);

		if(this.wmmode == 'start' || !this.wm.last) {
			this.wm.last = config.watermark || DEFAULTS.watermark;
		}

		if(callback)
			callback();
	}

	get mode() {
		return Input.MODE.pull;
	}

	async fetchData(time) {
		if(time && !this.sem.available())
			return await timer(time);

		await this.sem.take();

		let query = this.query(this.wm.last);
		let req = this.req = await this.server.request();
		req.stream = true;
		
		req.on('row',row=>{
			logger.silly(`${this.id} row fetch:`,row);
			this.wm.last = row;
			this.queue.push(row);
		});
		
		req.on('done',async()=>{
			logger.silly(`${this.id} Query completed`);
			await this.saveWatermark();
			this.sem.leave()
		});
		
		req.on('error',async(err)=>{
			logger.error(`${this.id} Query error`,err);
			await this.saveWatermark();
			this.sem.leave();
		});
		
		req.query(query);
		logger.silly(`${this.id}: Query: ${query}`);
	}

	async saveWatermark() {
		try {
			await this.watermark.save(this.wm);
			logger.silly(`${this.id}: Watermark saved`);
		}catch(err) {
			logger.error(err);
		}
	}

	async connect() {
		let connected = false;

		while(!connected) {
			try {
				await sql.connect
				this.server = await sql.connect(this.options);
				this.server.on('error', () => logger.warn(`${this.id}: SQLServer Error: `,this.options));
				connected = true;
			}catch(err) {
				logger.error(`${this.id}: Cannot stablish connection to SQLServer :`, this.options);
				logger.error(err);
				await timer(2000);
			}
		}
	}

	async start(callback) {
		this.connected = this.connect();
		
		this.ival = setInterval(()=>{
			try {
				if(this.queue.size() >= MAX_BUFF && !this.req.paused) {
					logger.warn(`${this.id} : Query paused!`);
					this.req.pause();
				}
				else if(this.queue.size() < MAX_BUFF/2 && this.req.paused) {
					logger.warn(`${this.id} : Query resumed!`);
					this.req.resume();
				}
			}catch(err) {}
		});

		if(callback) callback();
	}

	async next(callback) {
		await this.connected;
		
		while(!this.queue.size()) {			
			// Perform query or wait if query is already running
			await this.fetchData(1000);

			// Wait while query is executing or no data is provided
			while(!this.sem.available() && !this.queue.size()) {
				logger.silly(`${this.id} : Waiting to have results`);
				await timer(100);
			}			
		}

		// Take one element
		let data = await this.queue.pop();

		// Return data
		if(callback) {
			callback(null,{
				id : this.id,
				type : this.type,
				database : this.options.database,
				originalMessage: data
			});
		}
	}

	async stop(callback) {
		if(callback) callback();
	}

	async pause(callback) {
		if(callback) callback();
	}

	async resume(callback) {
		if(callback) callback();
	}

	key(entry) {
		return `${entry.input}:${entry.type}@${entry.database}`;
	}
}

if(module.parent) {
	module.exports = SQLServerInput;
}
else {
	logger.setLevel('debug');

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
