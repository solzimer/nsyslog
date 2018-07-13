function Queue() {
	var data = [];
	var defs = [];

	function voidfn() {}

	function resolve() {
		if(!defs.length) return;

		while(defs.length && data.length) {
			var d = defs.shift(), item = data.shift();
			if(d.$tid) clearTimeout(d.$tid);
			d.resolve(item);
			d.$callback(null,item);
		}
	}

	function timeout(d) {
		if(d.$timeout>0) {
			d.$tid = setTimeout(()=>{
				var err = new Error("Pop timeout");
				d.reject(err)
				d.$callback(err,null);
				var idx = defs.indexOf(d);
				if(idx>=0) defs.splice(idx,1);
			},d.$timeout);
		}
	}

	this.size = function() {
		return data.length;
	}

	this.stats = function() {
		return `Data: ${data.length} / Waits: ${defs.length}`;
	}

	this.push = function(item, callback) {
		data.push(item);
		resolve();
		if(callback) {
			callback();
		}
		else {
			return Promise.resolve();
		}
	}

	this.pop = function(callback,wait) {
		return new Promise((ok,rej)=>{
			var d = {resolve:ok, reject:rej};

			if(typeof(callback)=="number") {
				d.$timeout = callback;
				d.$callback = voidfn;
			}
			else if(typeof(callback)=="function") {
				d.$callback = callback;
				d.$timeout = parseInt(wait) || -1;
			}
			else {
				d.$callback = voidfn;
				d.$timeout = -1;
			}

			if(data.length) {
				var item = data.shift();
				d.resolve(item);
				d.$callback(null,item);
			}
			else {
				timeout(d);
				defs.push(d);
			}
		});
	}
}

module.exports = Queue;
