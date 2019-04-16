const cluster = require('./cluster');
const MODULE = 'shared-mem';

if(cluster.isMaster) {
	const SHM = new Map();

	function ensure(key) {
		if(!SHM.has(key))
			SHM.set(key,new Map());
	}

	class Master {
		async get(key) {
			return SHM.get(key);
		}

		async set(key,value) {
			SHM.set(key,value);
		}

		async hset(parent,key,value) {
			ensure(parent);
			SHM.get(parent).set(key,value);
		}

		async hpush(parent,key,value) {
			ensure(parent);
			let map = SHM.get(parent);
			if(!map.has(key)) map.set(key,[]);
			map.get(key).push(value);
		}

		async hget(parent,key) {
			ensure(parent);
			return SHM.get(parent).get(key);
		}
	}

	const instance = new Master();
	cluster.on(MODULE,async(child,module,msg)=>{
		let res = await instance[msg.cmd].apply(instance,msg.args);
		child.send({module:MODULE,cid:msg.cid,res});
	});

	module.exports = instance;
}
else {
	const MAP = new Map();
	let cid = 0;

	class Slave {
		send(cmd,args) {
			return new Promise((ok,rej)=>{
				MAP.set(++cid,{cid,ok,rej});
				process.send({cid,module:MODULE,datadir:this.datadir,cmd:cmd,args});
			});
		}
		async get(key) {
			return this.send('get',[key]);
		}

		async set(key,value) {
			return this.send('set',[key,value]);
		}

		async hpush(parent,key,value) {
			return this.send('hpush',[parent,key,value]);
		}

		async hset(parent,key,value) {
			return this.send('hset',[parent,key,value]);
		}

		async hget(parent,key) {
			return this.send('hget',[parent,key]);
		}
	}

	const instance = new Slave();
	cluster.on(MODULE,async(parent,module,msg)=>{
		let pr = MAP.get(msg.cid);
		MAP.delete(msg.cid);
		pr.ok(msg.res);
	});

	module.exports = instance;
}
