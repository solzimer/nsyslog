const
	logger = require('../logger'),
	Input = require('./'),
	moment = require('moment'),
	spawn = require("child_process").spawn,
	Watermark = require("../watermark"),
	Queue = require('../queue'),
	xml = require('xml2js').parseString;

const XML_OPTS = {
	explicitArray:false,
	mergeAttrs:true
}

const MODE = {
	offset : "offset",
	watermark : "watermark"
}

const OFFSET = {
	end : "end",
	begin : "begin",
	start : "start"
}

class WindowsInput extends Input {
	constructor(id) {
		super(id);
	}

	async configure(config,callback) {
		config = config || {};
		this.channel = config.channel || "Application";
		this.readmode = MODE[config.readmode] || MODE.offset;
		this.offset = config.offset;
		this.batchsize = parseInt(config.batchsize) || 1000;
		this.queue = new Queue();
		this.watermark = new Watermark(config.$datadir);
		await this.watermark.start();
		this.wm = await this.watermark.get(this.id);

		this.reading = null;
		callback();
	}

	get mode() {
		return Input.MODE.pull;
	}

	fetch() {
		if(this.reading) return this.reading;

		let wm = this.wm[this.channel];
		let args = [
			"qe", wm.channel,
			"/f:XML",
			`/c:${this.batchsize}`,
			`/q:Event[System[TimeCreated[@SystemTime>'${wm.ts}']]]`
		];

		this.reading = new Promise((ok,rej)=>{
			let child = spawn('wevtutil',args);
			let buffer = "";

			child.stdout.on('data', async (data) => {
				buffer += `${data}`;
				let lines = buffer.split("</Event>\r");
				let last = lines[lines.length-1].trim();
				if(!last.endsWith('</EventData>')) buffer = lines.pop();
				else buffer = "";
				lines = lines.map(l=>`${l}</Event>`);

				let jslines = await Promise.all(
					lines.map(l=>new Promise((ok,rej)=>{
						xml(l,XML_OPTS,(err,json)=>err?ok({err}):ok(json));
					}))
				);

				jslines.filter(j=>j!=null).forEach(json=>{
					if(!json.err) {
						let newTs = json.Event.System.TimeCreated.SystemTime;
						json.Event.SystemTime = newTs;
						if(wm.ts<newTs) wm.ts = newTs;
					}
					this.queue.push(json);
				});
			});

			child.on('error', rej);
			child.on('close', code => {
				if(code!=0) rej(`child process exited with code ${code}`);
				else ok();
			});
		}).then(()=>{
			this.reading = false;
			return this.watermark.save(this.wm);
		}).catch(err=>{
			logger.error(err);
			this.reading = false;
			return this.watermark.save(this.wm);
		});

		return this.reading;
	}

	async next(callback) {
		let read = false;
		while(!read) {
			try {
				let item = await this.queue.pop(1000);
				if(item.err)
					callback(item.err);
				else
					callback(null,{channel: this.channel, originalMessage: item.Event});

				read = true;
			}catch(err) {
				this.fetch();
			}
		}
	}

	setupWatermark() {
		var exists = true, wm = null;
		if(!this.wm[this.channel]) {
			exists = false;
			this.wm[this.channel] = {
				channel:this.channel,
				ts:'1970-01-01T00:00:00.000000000Z'
			}
		}
		wm = this.wm[this.channel];

		// Offset mode, ignore previous watermark
		if(this.readmode==MODE.offset) {
			if(this.offset==OFFSET.begin || this.offset==OFFSET.start) {
				wm.ts = '1970-01-01T00:00:00.000000000Z';
			}
			else if(this.offset==OFFSET.end) {
				wm.ts = moment().format('YYYY-MM-DDTHH:mm:ss')+'.000000000Z';
			}
			else {
				wm.ts = this.offset;
			}
		}
		// Watermark mode (if new)
		else if(!exists){
			if(this.offset==OFFSET.begin || this.offset==OFFSET.start) {
				wm.ts = '1970-01-01T00:00:00.000000000Z';
			}
			else if(this.offset==OFFSET.end) {
				wm.ts = moment().format('YYYY-MM-DDTHH:mm:ss')+'.000000000Z';
			}
			else {
				wm.ts = this.offset;
			}
		}
	}

	async start(callback) {
		try {
			this.setupWatermark();
			this.fetch();
			callback();
		}catch(err) {
			callback(err);
		}
	}

	async stop(callback) {
		await this.watermark.save(this.wm);
		callback();
	}

	async pause(callback) {
		await this.watermark.save(this.wm);
		callback();
	}

	resume(callback) {
		callback();
	}
}

module.exports = WindowsInput;
