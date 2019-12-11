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
};

const DBMAP = {};
const INSTANCES = {};
const DEF_FOLDER = './watermarks';
const MODE = {master:1,child:2};

/**
 * Watermark interface
 * @class
 * @abstract
 * @memberof Watermark
 */
class WatermarkDB {
	/**
	 * Starts the database
	 * @return {Promise}
	 */
	async start() {}

	/**
	 * @private
	 * @param  {string} cmd Parent command
	 * @param  {args} args Command arguments
	 * @return {Promise<Object>} Command result
	 */
	send(cmd,args) {}

	/**
	 * Retreive an object by its key
	 * @param  {string} id Key of the stored object
	 * @return {Object} Object value
	 */
	get(id) {}

	/**
	 * Creates a placeholder for an object
	 * @param  {string} id Key of the object to store
	 * @return {Object} Object value
	 */
	create(id) {}

	/**
	 * Remove the object but mantains the placeholder
	 * @param  {string} id Object key
	 * @return {Object} Clean object
	 */
	clean(id) {}

	/**
	 * Removes an object and its key
	 * @param  {string} id Object key
	 * @return {Object} Deleted object
	 */
	remove(id) {}

	/**
	 * Saves (and creates if not exists) an object
	 * @param  {Object} wm Object to be saved
	 * @return {Object} Saved object
	 */
	save(wm) {}
}

/**
 * Watermark class for children processes
 * @class
 * @extends Watermark.WatermarkDB
 * @memberof Watermark
 * @param {string} datadir Data folder of the database
 */
class ChildDB extends WatermarkDB {
	constructor(datadir) {
		super();
		datadir = Path.resolve(datadir||'.',DEF_FOLDER);

		this.map = {};
		this.cid = 1;
		this.datadir = datadir;
	}

	async start() {
		cluster.on(MODULE,(process,module,msg)=>{
			if(msg.mode!=MODE.master) return;

			let map = this.map, cid = msg.cid;
			if(map[cid]) {
				if(msg.cmd==CMD.success) map[cid].ok(msg.res);
				else map[cid].rej(msg.error);
				delete map[msg];
			}
			else logger.warn('wm-child received unknown CID message',msg.cmd,msg.cid);
		});
	}

	send(cmd,args) {
		let cid = this.cid++;
		return new Promise((ok,rej)=>{
			this.map[cid] = {cid,ok,rej};
			process.send({cid,pid:process.pid,module:MODULE,mode:MODE.child,datadir:this.datadir,cmd,args});
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

/**
 * Watermark class for master processes
 * @class
 * @extends Watermark.WatermarkDB
 * @memberof Watermark
 * @param {string} datadir Data folder of the database
 */
class MasterDB extends WatermarkDB {
	constructor(datadir) {
		super();
		this.datadir = Path.resolve(datadir||'.',DEF_FOLDER);
	}
	async start() {
		let datadir = this.datadir;

		await fs.ensureDir(datadir);

		if(!DBMAP[datadir]) {
			DBMAP[datadir] = levelup(leveldown(datadir));
		}

		this.db = DBMAP[datadir];
	}

	/**
	 * Fetch all keys from the database
	 * @return {Promise<String[]>} Array of keys
	 */
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
		await this.db.put(wm._id,JSON.stringify(wm));
		return wm;
	}

	/**
	 * Created a read stream that reads all stored values that match a criteria
	 * @param  {Object}   q        Query condition (see {@link https://github.com/Level/levelup#createReadStream})
	 * @param  {Function} callback Callback for each read value
	 * @return {Promise} Resolved when stream ends
	 */
	readStream(q,callback) {
		return new Promise((ok,rej)=>{
			let str = this.db.createReadStream(q);
			str.on('data', data=>callback(data.key.toString(),JSON.parse(data.value)));
			str.on('error', rej);
			str.on('close', ok);
			str.on('end', ok);
		});
	}

	/**
	 * Save multiple objects at once
	 * @param  {Array<Object>} arr Objects to store
	 * @return {Promise} Operation retult
	 */
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

	/**
	 * Deletes multiple objects at once
	 * @param  {Array<String>} arr Array of object keys
	 * @return {Promise} Operation retult
	 */
	removeall(ids) {
		let ops = ids.map(key=>{return {type:"del",key};});
		return this.db.batch(ops);
	}
}

if(cluster.isMaster) {
	cluster.on(MODULE,async(child,module,msg)=>{
		if(msg.mode!=MODE.child) return;
		let datadir = msg.datadir;

		if(!INSTANCES[datadir]) {
			let mdb = new MasterDB(datadir);
			await mdb.start();
			INSTANCES[datadir] = mdb;
		}

		let mdb = INSTANCES[datadir];

		try {
			let res = await mdb[msg.cmd].apply(mdb,msg.args);
			child.send({module:MODULE,mode:MODE.master,pid:msg.pid,cmd:CMD.success,cid:msg.cid,res});
		}catch(err) {
			logger.error(err);
			child.send({module:MODULE,mode:MODE.master,pid:msg.pid,cmd:CMD.error,cid:msg.cid,error:err.message});
		}
	});
}

MasterDB.Master = MasterDB;
ChildDB.Master = MasterDB;

/**
 * Watermark module
 * @namespace
 * @description <p>Watermark is an embedded key/value database (powered by leveldb), intended
 * primarily to store input watermarks that persist NSyslog engine restarts, but can be
 * used by any module that needs some kind of long term persistence.<br/>
 * Watermark comes in two flavours:</p>
 * <ul>
 * 	<li>{@link Watermark.MasterDB} : MasterDB is intended to be used by the master process, and has direct
 * 	access to the storage database</li>
 * 	<li>{@link Watermark.ChildDB} : ChildDB is used by child processes when the storage database is owned
 * 	by the parent process.</li>
 * <p>Watermark module will automátically give you a MasterDB instance when run in parent process, and
 * a ChildDB instance when running a child process, but in this case, you can also get a
 * MasterDB using the {@link ChildDB.Master} property</p>
 * <p>Keep in mind that only one process can own access to a storage database, so, if multiple
 * processes must access to the same database, you must use a ChildDB for all of them (except for
 * the parent process)</p>
 *
 * @example
 * //Parent process
 * const Watermark = require('nsyslog').Core.Watermark;
 * let wm = new Watermark('/tmp/dbpath');
 * await wm.start();
 * await wm.store({id:'mykey', data:{k1:'v1',k2:'v2'}});
 *
 * @example
 * // Child Process
 * // This will obtain a ChildDB instance that comunicates to the parent MasterDB
 * // instance via IPC (if none exists in the parent process, one will be automatically created)
 * const Watermark = require('nsyslog').Core.Watermark;
 * let wm = new Watermark('/tmp/dbpath');
 * await wm.start();
 * let res = await wm.get('mykey');
 *
 * // This will use a MasterDB in a child process. Be carefull that the database is not
 * // currently used by any other process
 * const MasterDB = Watermark.Master;
 * ...
 */
const Watermark = cluster.isMaster? MasterDB : ChildDB;
if(module.parent) {
	module.exports = Watermark;
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
