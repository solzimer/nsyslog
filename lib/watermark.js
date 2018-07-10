const
	PouchDB = require('pouchdb'),
	logger = require('./logger');

class FakeDB {
	constructor() {
		this.map = {};
	}
	async get(id) {
		if(this.map[id]) return this.map[id];
		else throw new Error('Not found');
	}
	async put(wm) {
		this.map[wm._id] = wm;
	}
}

const isMaster = process.env["NODE_FORKED"]!='true';
const db = isMaster? new PouchDB('watermarks') : new FakeDB();

async function get(id) {
	try {
		return await db.get(id);
	}catch(err) {
		return create(id);
	}
}

async function create(id) {
	let wm = {_id:id};
	await db.put(wm);
	return db.get(id);
}

async function clean(id) {
	let wm = await db.get(id);
	Object.keys(wm).
		filter(k=>k!='_id' && k!='_rev').
		forEach(k=>delete wm[k]);
	return db.put(wm);
}

async function remove(id) {
	return db.get(id);
}

async function save(wm) {
	let res = await db.put(wm);
	wm._rev = res.rev;
	return wm;
}

module.exports = {
	get, create, clean, remove, save
}

if(!module.parent) {
	console.log(`Retrieve watermark ${process.argv[2]}`);
	get(process.argv[2]).then(res=>{
		console.log(JSON.stringify(res,null,2));
	}).catch(err=>{
		console.error(err);
	});
}
