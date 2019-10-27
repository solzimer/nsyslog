const cluster = require('./cluster');
const MODULE = 'shared-mem';
const SHM = {};

function ensure(key) {
	if(!SHM[key])
		SHM[key] = {};
}

/**
 * Shared Memory
 * @class
 * @description Shared memory between all NSyslog parent / child
 * processes. Main process and child processes can trasparently
 * access to the objects stored by any of them.<br/>
 * Although the API is synchronous, it works internally in
 * asynchronous mode, so don't expect that a value stored by a
 * process will be inmediately accesible by other process until
 * all the background work has been done.<br/><br/>
 *
 * SharedMem is not meant to be instanced by its contructor, but obtained as a singleton instance
 * by the shm module
 * @example
 * const shm = require('nsyslog/lib/shm');
 * @example
 * const shm = require('nsyslog').Core.Shm;
 */
class SharedMem {
	/**
	 * Retrieve an object by its key (value <- shm[key])
	 * @param  {string} key Object key
	 * @return {object} Object
	 */
	get(key) {
		return SHM[key];
	}

	/**
	 * Stores a key / object value (shm[key] = value)
	 * @param {string} key Object key
	 * @param {object} value Object value
	 */
	set(key,value) {
		SHM[key] = value;
	}

	/**
	 * Stores a key / value object inside a map (shm[parent][key] = value)
	 * @param {string} parent Map key
	 * @param {string} key Object key
	 * @param {object} value Object value
	 */
	hset(parent,key,value) {
		ensure(parent);
		SHM[parent][key] = value;
	}

	/**
	 * Pushes a key / value object inside an array (shm[parent][key].push(value))
	 * @param {string} parent Array key
	 * @param {string} key Object key
	 * @param {object} value Object value
	 */
	hpush(parent,key,value) {
		ensure(parent);
		let map = SHM[parent];
		if(!map[key]) map[key] = [];
		map[key].push(value);
	}

	/**
	 * Gets a key / value object from a map (value <- shm[parent][key])
	 * @param {string} parent Map key
	 * @param {string} key Object key
	 */
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
			child.send({module:MODULE,cmd,args,master:true});
		});
	}

	class Master {
		constructor() {
			this.shm = new SharedMem();
			cluster.on(MODULE,async(child,module,msg)=>{
				switch(msg.cmd) {
					case 'subscribe' :
						child.send({module:MODULE,cmd:'subscribe',res:SHM,master:true});
						listeners.set(child.pid,child);
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
		process.send({module:MODULE,cmd,args,pid:process.pid});
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

		set(key,value,ignore) {
			this.shm.set(key,value);
			send('set',[key,value],ignore);
		}

		hpush(parent,key,value,ignore) {
			this.shm.hpush(parent,key,value);
			send('hpush',[parent,key,value],ignore);
		}

		hset(parent,key,value,ignore) {
			this.shm.hset(parent,key,value);
			send('hset',[parent,key,value],ignore);
		}

		hget(parent,key) {
			return this.shm.hget(parent,key);
		}
	}

	module.exports = new Slave();
}
