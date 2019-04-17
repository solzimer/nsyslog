const cluster = require('./cluster');
const MODULE = 'shared-mem';
const SHM = {};

function ensure(key) {
	if(!SHM[key])
		SHM[key] = {};
}

class SharedMem {
	get(key) {
		return SHM[key];
	}

	set(key,value) {
		SHM[key] = value;
	}

	hset(parent,key,value) {
		ensure(parent);
		SHM[parent][key] = value;
	}

	hpush(parent,key,value) {
		ensure(parent);
		let map = SHM[parent];
		if(!map[key]) map[key] = [];
		map[key].push(value);
	}

	hget(parent,key) {
		ensure(parent);
		return SHM[parent][key];
	}
}

if(cluster.isMaster) {
	const listeners = new Map();

	function send(cmd,args,pid) {
		listeners.forEach(child=>{
			if(child.pid==pid) return;
			child.send({module:MODULE,cmd,args});
		});
	}

	class Master {
		constructor() {
			this.shm = new SharedMem();
			cluster.on(MODULE,async(child,module,msg)=>{
				switch(msg.cmd) {
					case 'subscribe' :
						child.send({module:MODULE,cmd:'subscribe',res:SHM});
						break;
					default :
						this[msg.cmd].apply(this,msg.args.concat(child.pid));
						break;
				}
			});
		}

		get(key,pid) {
			return this.shm.get(key);
		}

		set(key,value,pid) {
			this.shm.set(key,value);
			send('set',[key,value],pid);
		}

		hset(parent,key,value,pid) {
			this.shm.hset(parent,key,value);
			send('hset',[parent,key,value],pid);
		}

		hpush(parent,key,value,pid) {
			this.shm.hpush(parent,key,value);
			send('hpush',[parent,key,value],pid);
		}

		hget(parent,key,pid) {
			return this.shm.hget(parent,key);
		}
	}

	module.exports = new Master();
}
else {
	function send(cmd,args,ignore) {
		if(ignore) return;
		process.send({module:MODULE,cmd,args});
	}

	class Slave {
		constructor() {
			this.shm = new SharedMem();
			process.send({module:MODULE,cmd:'subscribe'});
			cluster.on(MODULE,async(parent,module,msg)=>{
				switch(msg.cmd) {
					case 'subscribe' :
						Object.assign(SHM,msg.res);
						break;
					default :
						this[msg.cmd].apply(this,msg.args.concat(true));
						break;
				}
			});
		}

		get(key) {
			return this.shm.get(key);
		}

		set(key,value) {
			this.shm.set(key,value);
			send('set',[key,value]);
		}

		hpush(parent,key,value) {
			this.shm.hpush(parent,key,value);
			send('hpush',[parent,key,value]);
		}

		hset(parent,key,value) {
			this.shm.hset(parent,key,value);
			send('hset',[parent,key,value]);
		}

		hget(parent,key) {
			return this.shm.hget(parent,key);
		}
	}

	module.exports = new Slave();
}
