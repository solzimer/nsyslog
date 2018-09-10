const
	levelup = require('levelup'),
	leveldown = require('leveldown'),
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

const DEF_FOLDER = './watermarks';

class ChildDB {
	constructor() {
		this.map = {};
		this.cid = 1;
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
			process.send({cid,module:MODULE,cmd:CMD.get,args});
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
	constructor() {
		this.db = levelup(leveldown(DEF_FOLDER));
		cluster.on(MODULE,async(child,module,msg)=>{
			try {
				let res = await this[msg.cmd].apply(this,msg.args);
				child.send({module:MODULE,cmd:CMD.success,cid:msg.cid,res});
			}catch(err) {
				child.send({module:MODULE,cmd:CMD.error,cid:msg.cid,error:err.message});
			}
		});
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
}

if(module.parent) {
	module.exports = cluster.isMaster? new MasterDB() : new ChildDB();
}
else {
	let db = new MasterDB();
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
