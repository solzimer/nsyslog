const
	logger = require('../logger'),
	Input = require('./'),
	{spawn,exec} = require("child_process"),
	Watermark = require("../watermark"),
	Queue = require('../queue'),
	Semaphore = require('../semaphore'),
	jsexpr = require('jsexpr'),
	path = require('path'),
	fs = require('fs-extra'),
	xml = require('xml2js').parseString;

const BM_TMPL = jsexpr.expr("<BookmarkList><Bookmark Channel='${channel}' RecordId='${rid}' IsCurrent='true'/></BookmarkList>");
const RX_RID = /RecordId='(\d+)'/;
const SEM = new Semaphore(1);
const XML_OPTS = {
	explicitArray:false,
	mergeAttrs:true
};

const MODE = {
	offset : "offset",
	watermark : "watermark"
};

const OFFSET = {
	end : "end",
	begin : "begin",
	start : "start"
};

function fexists(filepath) {
	return new Promise((ok,rej)=>{
		fs.open(filepath, 'r', (err, fd) => {
		  if (err) {
		    if (err.code==='ENOENT') return ok(false);
		    else return rej(err);
		  }
		  else fs.close(fd,()=>ok(true));
		});
	});
}

class WindowsInput extends Input {
	constructor(id,type) {
		super(id,type);
		this.iread = true;
	}

	async configure(config,callback) {
		config = config || {};
		this.channel = config.channel || "Application";
		this.readmode = MODE[config.readmode] || MODE.offset;
		this.offset = config.offset;
		this.batchsize = parseInt(config.batchsize) || 1000;
		this.queue = new Queue();
		this.remote = config.remote || false;
		this.username = config.username || null;
		this.password = config.password || null;
		this.query = config.query || null;
		this.watermark = new Watermark(config.$datadir);
		this.extended = config.extended || false;
		this.path = config.$datadir;
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
			`/f:${this.extended? 'RenderedXml':'XML'}`,
			`/c:${this.batchsize}`,
			`/BM:${wm.bm}`,
			`/SBM:${wm.bm}`
		];

		if(this.remote) args.push(`/r:${this.remote}`);
		if(this.username) args.push(`/u:${this.username}`);
		if(this.password) args.push(`/p:${this.password}`);

		this.reading = new Promise((ok,rej)=>{
			logger.debug(`Launch 'wevtutil ${args.join(" ")}'`);
			let child = spawn('wevtutil',args);
			let buffer = "";

			child.stderr.on('data', data => {
				logger.silly(`${this.id} : ${data}`);
			});

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
					}

					// Fix EventID
					if(json.Event.System.EventID._) {
						json.Event.System.Qualifiers = json.Event.System.EventID.Qualifiers;
						json.Event.System.EventID = json.Event.System.EventID._;
					}

					// Remap eventdata for easy processing
					if(json.Event.EventData && json.Event.EventData.Data) {
						let edata = json.Event.EventData.Data;
						if(typeof(edata)=='string') {
							json.Event.EventData.Data = {Message:edata};
						}
						else if(Array.isArray(edata)){
							json.Event.EventData.Data = edata.reduce((map,item,i)=>{
								if(item.Name)	map[item.Name] = item._;
								else map[i] = item;
								return map;
							},{});
						}
					}
					this.queue.push(json);
				});
			});

			child.on('error', rej);
			child.on('close', code => {
				if(code==0) ok();
				else if(code==15008) ok();
				else rej(`child process exited with code ${code}`);
			});
		}).then(()=>{
			this.reading = false;
			return this.watermark.save(this.wm);
		}).catch(err=>{
			logger.error(`Error on channel ${this.channel}`,err);
			logger.error(bmxml);
			//logger.error(err);
			this.reading = false;
			return this.watermark.save(this.wm);
		});

		return this.reading;
	}

	async next(callback) {
		if(!this.queue.size()) {

			// Read events
			await SEM.take();
			try {await this.fetch();}catch(err) {}
			SEM.leave();

			if(!this.queue.size()) {
				let timer = this.iread? 0 : 500;
				this.iread = false;
				setTimeout(()=>this.next(callback),timer);
			}
			else {
				setImmediate(()=>this.next(callback));
			}
			return;
		}

		try {
			let item = await this.queue.pop(1000);
			this.iread = true;

			if(item.err)
				callback(item.err);
			else
				callback(null,{channel: this.channel, originalMessage: item.Event});
		}catch(err) {
				callback(err);
		}
	}

	async initWatermark() {
		let file = path.resolve(this.path,`watermarks/input/${this.id}_${Math.random()}.xml`);
		await fs.ensureFile(file);
		return {channel : this.channel,	bm : file};
	}

	writeWatermark(wm,offset) {
		return new Promise(async(ok,rej)=>{
			if(offset==OFFSET.begin || offset==OFFSET.start || offset==OFFSET.end) {
				exec(`wevtutil qe "${wm.channel}" /c:1 "/SBM:${wm.bm}" /RD:${offset==OFFSET.end}`,async(err,stdout,stderr)=>{
					if(err) return rej({err,stderr});
					let xml = await fs.readFile(wm.bm,'utf-8');
					let rid = (xml.match(RX_RID)||[])[1] || 0;
					await fs.writeFile(wm.bm,BM_TMPL({channel:wm.channel,rid}),'utf-8');
					ok();
				});
			}
			else if(typeof(offset)=='number') {
				rid = offset;
				await fs.writeFile(wm.bm,BM_TMPL({channel:wm.channel,rid}),'utf-8');
				ok();
			}
			else if(typeof(offset)=='string') {
				let q = `/q:Event[System[TimeCreated[@SystemTime>'${offset}']]]`;
				exec(`wevtutil qe "${wm.channel}" "/SBM:${wm.bm}" /c:1 "${q}"`,async(err,stdout,stderr)=>{
					if(err) return rej({err,stderr});
					let xml = await fs.readFile(wm.bm,'utf-8');
					let rid = (xml.match(RX_RID)||[])[1] || 0;
					await fs.writeFile(wm.bm,BM_TMPL({channel:wm.channel,rid}),'utf-8');
					ok();
				});
			}
		});
	}

	async setupWatermark() {
		var exists = true, wm = null;
		let iwm = this.wm[this.channel];
		if(!iwm || !iwm.bm) {
			logger.debug(`${this.id}: Initialize watermark for Windows channel ${this.channel}`);
			this.wm[this.channel] = await this.initWatermark();
			wm = this.wm[this.channel];
			exists = false;
		}
		else {
			logger.debug(`${this.id}: Watermark for Windows channel ${this.channel} exists in db`);
			wm = this.wm[this.channel];
			exists = await fexists(wm.bm);
			logger.debug(`${this.id}: File exists: ${exists}`);
			if(exists) {
				logger.debug(`${this.id} Watermark is valid: ${exists}`);
			}
			else {
				this.wm[this.channel] = await this.initWatermark();
				wm = this.wm[this.channel];
				exists = false;
			}
		}

		logger.debug(wm);

		// Offset mode, ignore previous watermark
		if(this.readmode==MODE.offset || !exists) {
			await this.writeWatermark(wm,this.offset);
		}
	}

	async start(callback) {
		try {
			await this.setupWatermark();
			await this.fetch();
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
