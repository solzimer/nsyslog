const
	PouchDB = require('pouchdb'),
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
		this.db = new PouchDB('watermarks');
		cluster.on(MODULE,async(child,module,msg)=>{
			try {
				let res = await this[msg.cmd].apply(this,msg.args);
				child.send({module:MODULE,cmd:CMD.success,cid:msg.cid,res});
			}catch(err) {
				child.send({module:MODULE,cmd:CMD.error,cid:msg.cid,error:err.message});
			}
		});
	}
	async get(id) {
		try {
			return await this.db.get(id);
		}catch(err) {
			return this.create(id);
		}
	}
	async create(id) {
		let wm = {_id:id};
		await this.db.put(wm);
		return this.db.get(id);
	}
	async clean(id) {
		let wm = await this.db.get(id);
		Object.keys(wm).
			filter(k=>k!='_id' && k!='_rev').
			forEach(k=>delete wm[k]);
		return this.db.put(wm);
	}
	remove(id) {
		return this.db.get(id);
	}
	async save(wm) {
		let res = await this.db.put(wm);
		wm._rev = res.rev;
		return wm;
	}
}

module.exports = cluster.isMaster? new MasterDB() : new ChildDB();

if(!module.parent) {
	let db = new MasterDB();
	console.log(`Retrieve watermark ${process.argv[2]}`);
	db.get(process.argv[2]).then(res=>{
		console.log(JSON.stringify(res,null,2));
	}).catch(err=>{
		console.error(err);
	});
}
