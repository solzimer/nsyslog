const
	Path = require('path'),
	levelup = require('levelup'),
	leveldown = require('leveldown'),
	fs = require('fs-extra'),
	cluster = require('./cluster'),
	logger = require('./logger'),
	MODULE = 'cluster-watermark';

const CMD = {
	get : "get",
	create : "create",
	clean : "clean",
	remove : "remove",
	save : "save",
	error : "error",
	success : "success"
}

const DBMAP = {};
const DEF_FOLDER = './watermarks';

class ChildDB {
	constructor(datadir) {
		datadir = Path.resolve(datadir||'.',DEF_FOLDER);

		this.map = {};
		this.cid = 1;
		this.datadir = datadir;
	}
	async start() {
		cluster.on(MODULE,(process,module,msg)=>{
			let map = this.map, cid = msg.cid;
			if(map[cid]) {
				if(msg.cmd==CMD.success) map[cid].ok(msg.res);
				else map[cid].rej(msg.error);
				delete map[msg];
			}
			else logger.warn(msg);
		});
	}
	send(cmd,args) {
		let cid = this.cid++;
		return new Promise((ok,rej)=>{
			this.map[cid] = {cid,ok,rej};
			process.send({cid,module:MODULE,datadir:this.datadir,cmd:CMD.get,args});
		});
	}
	get(id) {
		return this.send(CMD.get,[id]);
	}
	create(id) {
		return this.send(CMD.create,[id]);
	}
	clean(id) {
		return this.send(CMD.clean,[id]);
	}
	remove(id) {
		return this.send(CMD.remove,[id]);
	}
	save(wm) {
		return this.send(CMD.save,[wm]);
	}
}

class MasterDB {
	constructor(datadir) {
		this.datadir = Path.resolve(datadir||'.',DEF_FOLDER);
	}
	async start() {
		let datadir = this.datadir;

		await fs.ensureDir(datadir);

		if(!DBMAP[datadir]) {
			DBMAP[datadir] = levelup(leveldown(datadir));
			cluster.on(MODULE,async(child,module,msg)=>{
				if(!msg.datadir==datadir) return;

				try {
					let res = await this[msg.cmd].apply(this,msg.args);
					child.send({module:MODULE,cmd:CMD.success,cid:msg.cid,res});
				}catch(err) {
					child.send({module:MODULE,cmd:CMD.error,cid:msg.cid,error:err.message});
				}
			});
		}

		this.db = DBMAP[datadir];
	}
	keys() {
		return new Promise((ok,rej)=>{
			let keys = [];
			this.db.
				createKeyStream().
				on('data', d=>keys.push(d.toString())).
				on('end',()=>ok(keys)).
				on('error',rej);
		});
	}
	async get(id) {
		try {
			let wm = await this.db.get(id);
			return JSON.parse(wm.toString());
		}catch(err) {
			return this.create(id);
		}
	}
	async create(id) {
		let wm = {_id:id};
		await this.db.put(id,JSON.stringify(wm));
		return this.get(id);
	}
	async clean(id) {
		let wm = await this.get(id);
		Object.keys(wm).
			filter(k=>k!='_id' && k!='_rev').
			forEach(k=>delete wm[k]);
		return this.save(wm);
	}
	remove(id) {
		return this.db.del(id);
	}
	async save(wm) {
		let res = await this.db.put(wm._id,JSON.stringify(wm));
		return wm;
	}
	readStream(q,callback) {
		return new Promise((ok,rej)=>{
			let str = this.db.createReadStream(q);
			str.on('data', data=>callback(data.key.toString(),JSON.parse(data.value)));
			str.on('error', rej);
			str.on('close', ok);
			str.on('end', ok);
		});
	}
	saveall(arr) {
		let ops = null;

		if(Array.isArray(arr)) {
			ops = arr.map(item=>{
				return {type:"put",key:item.key,value:JSON.stringify(item.value)};
			});
		}
		else {
			ops = Object.keys(arr).map(key=>{
				return {type:"put",key,value:JSON.stringify(arr[key])};
			});

			return this.db.batch(ops);
		}
	}
	removeall(ids) {
		let ops = ids.map(key=>{return {type:"del",key};});
		return this.db.batch(ops);
	}
}

if(module.parent) {
	module.exports = cluster.isMaster? MasterDB : ChildDB;
}
else {
	let db = new MasterDB(process.argv[2]);
	console.log(`Retrieve watermark ${process.argv[2]}`);

	db.keys().then(keys=>{
		console.log(keys);
		keys.forEach(key=>{
			db.get(key).then(res=>{
				console.log(JSON.stringify(res,null,2));
			}).catch(err=>{
				console.error(err);
			});
		});
	});
}
