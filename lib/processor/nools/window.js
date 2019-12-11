const
	os = require('os'),
	Watermark = require("../../watermark"),
	Semaphore = require('../../semaphore'),
	jsexpr = require('jsexpr'),
	EventEmitter = require('events');

var prdb = null;
const CACHE = {};
const MAX = 1000;
function count() {return 1;}

async function getDb() {
	if(!prdb) {
		prdb = new Promise(async(ok)=>{
			let db = new Watermark(Window.Path);
			await db.start();
			ok(db);
		});
	}
	return prdb;
}

async function getBuffer(window) {
	let key = window.wkey;
	let db = await getDb();

	if(CACHE[key]) {
		let item = CACHE[key];
		item.ttl = Date.now();
		return item;
	}
	else {
		let item = await db.get(key);
		if(!item.buffer) item.buffer = [];
		item.ttl = Date.now();

		let list = Object.keys(CACHE);
		if(list.length>MAX) {
			list = list.map(k=>CACHE[k]).sort((a,b)=>a.ttl-b.ttl);
			let rem = [];
			while(list.length>MAX) {
				rem.push(list.shift());
				delete CACHE[key];
			}
			await Promise.all(rem.map(item=>db.save(item)));
		}
		CACHE[key] = item;
		return item;
	}
}

async function saveBuffer(window,cbuff) {
	let key = window.wkey;
	cbuff.ttl = Date.now();
	CACHE[key] = cbuff;
}

async function cleanBuffer(window) {
	let key = window.wkey;
	delete CACHE[key];
	let db = await getDb();
	await db.remove(key);
}

class Window extends EventEmitter {
	constructor(name,key,entry,time,size) {
		super();

		this.name = name;
		this.key = key;
		this.time = time;
		this.size = size;
		this.expr = jsexpr.eval(key);
		this.keyval = this.expr(entry);
		this.wkey = `${this.name}@${this.keyval}`;
		this.mutex = new Semaphore(1);
		this.ival = setTimeout(()=>this._statLoop(),10);
	}

	async _statLoop() {
		let cbuff = await getBuffer(this),
				buff = cbuff.buffer,
				time = this.time,
				size = this.size;

		if(time>0) {
			let then = Date.now() - time;
			let litem = null;

			while(buff[0] && buff[0].ts<then) {
				litem = buff.shift();
			}

			if(!buff.length && litem) {
				clearInterval(this.ival);
				this.emit('destroy');
			}
		}

		if(size>0 && buff.length>size) {
			while(buff.length>size)
				buff.shift();
		}

		await saveBuffer(this,cbuff);
		this.ival = setTimeout(()=>this._statLoop(),10);
	}

	match(entry) {
		return this.keyval == this.expr(entry);
	}

	async add(entry) {
		let ts = Date.now();
		await this.mutex.take();
		let cbuff = await getBuffer(this);
		cbuff.buffer.push({entry,ts});
		await saveBuffer(this,cbuff);
		this.mutex.leave();
	}

	async value(accfn, initval) {
		initval = initval || 0;
		accfn = accfn || count;

		await this.mutex.take();
		let cbuff = await getBuffer(this);
		let buff = cbuff.buffer;
		this.mutex.leave();

		let res = buff.reduce((val,item)=>val+accfn(item.entry),initval);
		//console.log(`Window ${this.name} - ${this.keyval} : ${res}`);
		return res;
	}

	async clear() {
		let cbuff = await getBuffer(this);
		cbuff.buffer = [];
		await saveBuffer(this,cbuff);
	}

	async $destroy() {
		clearTimeout(this.ival);
		await cleanBuffer(this);
	}
}

Window.Path = os.tmpdir();
module.exports = Window;
