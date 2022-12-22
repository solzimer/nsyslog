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

const FORMAT = {
	xml : "xml",
	json : "json"
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
		this.watermark = Watermark.getInstance(config.$datadir);
		this.extended = config.extended || false;
		this.path = config.$datadir;
		this.format = config.format || FORMAT.json;
		this.interval = config.interval || 500;
		this.idfilter = config.idfilter || null;
		this.child = null;
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

		if(this.idfilter) {
			let idpath = this.idfilter.map(id=>`(EventID=${id})`).join(' or ');
			args.push(`/q:*[System [${idpath}]]`);
		}

		if(this.remote) args.push(`/r:${this.remote}`);
		if(this.username) args.push(`/u:${this.username}`);
		if(this.password) args.push(`/p:${this.password}`);

		this.reading = new Promise((ok,rej)=>{
			logger.debug(`Launch 'wevtutil ${args.join(" ")}'`);
			let child = this.child = spawn('wevtutil',args);
			let buffer = "";

			child.stderr.on('data', data => {
				logger.warn(`${this.id} : ${data}`);
			});

			child.stdout.on('data', async (data) => {
				buffer += `${data}`;
				buffer = buffer.trim().replace(/\r/g,'');
				let lines = buffer.split("</Event>");
				let last = lines[lines.length-1].trim();
				if(!last.endsWith('</EventData>')) buffer = lines.pop();
				else buffer = "";
				lines = lines.map(l=>`${l}</Event>`);

				if(this.format!=FORMAT.json) {
					let llen = lines.length;
					for(let i=0;i<llen;i++) {
						this.queue.push({Event:lines[i]});
					}
				}
				else {
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
				}
			});

			child.on('error', rej);
			child.on('close', async(code) => {
				logger.debug(`${this.id} => Exit Code ${code}`);
				// Success code
				if(code==0) ok();
				// Invalid watermark code
				else if(code==87 || code==2) {
					logger.warn(`${this.id} Watermark is corrupted. Restarting`);
					await this.setupWatermark(true);
					ok();
				}
				else if(code==15008) ok();
				else rej(`child process exited with code ${code}`);
			});
		}).then(()=>{
			this.reading = false;
			logger.silly(`[${this.id}] => Save watermark (then)`);
			this.child.kill(9);
			return this.watermark.save(this.wm);
		}).catch(err=>{
			logger.error(`Error on channel ${this.channel}`,err);
			this.reading = false;
			logger.silly(`[${this.id}] => Save watermark (catch)`);
			this.child.kill(9);
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
				let timer = this.iread? 0 : this.interval;
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

	/**
	 * Setups the reader watermark
	 * @param {boolean} reset 
	 */
	async setupWatermark(reset) {
		if(reset) {
			let oldwm = this.wm[this.channel];
			if(oldwm) {
				try {await fs.unlink(oldwm.bm);}catch(err) {}
			}
			delete this.wm[this.channel];
		}

		var exists = true, flen = 0, wm = null;		
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
			if(exists) flen = await fs.statSync(wm.bm).size;
			logger.debug(`${this.id}: File exists: ${exists} / ${flen}`);
			if(exists && flen) {
				logger.info(`${this.id} Watermark is valid: ${exists} / ${flen}`);
			}
			else {
				logger.warn(`${this.id} Watermark is not valid. Reinitializing: ${exists} / ${flen}`);
				this.wm[this.channel] = await this.initWatermark();
				wm = this.wm[this.channel];
				exists = false;
			}
		}

		// Offset mode, ignore previous watermark
		if(this.readmode==MODE.offset || !exists) {
			await this.writeWatermark(wm,this.offset);
		}
	}

	async start(callback) {
		try {
			if(this.child)
				this.child.kill(9);
			await this.setupWatermark();
			await this.fetch();
			if(callback) callback();
		}catch(err) {
			if(callback) callback(err);
		}
	}

	async stop(callback) {
		logger.info(`[${this.id}] => Save watermark (stop)`);
		await this.watermark.save(this.wm);
		if(this.child)
			this.child.kill(9);
		if(callback) callback();
	}

	async pause(callback) {
		logger.info(`[${this.id}] => Save watermark (pause)`);
		await this.watermark.save(this.wm);
		if(this.child)
			this.child.kill(9);
		if(callback) callback();
	}

	resume(callback) {
		if(callback) callback();
	}
}

module.exports = WindowsInput;
