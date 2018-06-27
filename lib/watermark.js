const
	PouchDB = require('pouchdb'),
	logger = require('./logger');

const db = new PouchDB('watermarks');

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
