const cluster = require("cluster");
const CHANNEL = "shared-mem";
const vfn = ()=>{};

if(cluster.isMaster) {
	var store = {};
	var workers = [];

	for (const id in cluster.workers) {
		workers.push(cluster.workers[id]);
	}
	workers.forEach(w=>{
		w.on("message",msg=>handleMessage(w,msg));
	})

	function handleMessage(worker, message) {
		console.log(message)
		if(message.channel!=CHANNEL) return;
		else {
			var op = message.op;
			var args = message.args;
			args.push(function(){
				var response = {
					channel:CHANNEL,
					cid:message.cid,
					type:"response",
					args:[].slice.call(arguments)
				};
				worker.send(response);
			});
			fns[op].apply(this,args);
		}
	}

	function configure(worker) {
		worker.on("message")
	}

	var fns = {
		set(path,item,ttl,callback) {
			if(typeof(ttl)=="function") {callback = ttl; ttl = null;}
			else {ttl = parseInt(ttl) || null;}
			callback = callback || vfn;

			store[path] = {ttl:ttl,entry:item};
			callback(null,item,ttl);
		},
		get(path,callback) {
			if(store[path]) {
				callback(null,store[path].entry);
			}
			else {
				callback("Entry not found",null);
			}
		},
		del(path,callback) {
			if(store[path]) {
				var item = store[path];
				delete store[path];
				callback(null,item.entry);
			}
			else {
				callback("Entry not found",null);
			}
		}
	}

	module.exports = fns;
}
else {
	var pending = {};

	process.on('message', handleMessage);

	function handleMessage(msg) {
		if(msg.channel!=CHANNEL) return;
		if(!pending[msg.cid]) return;
		var cb = pending[msg.cid];
		delete pending[msg.cid];
		cb.apply(this,msg.args);
	}

	function send(cmd,callback) {
		cmd.cid = `${process.pid}_${Math.random()}`;
		cmd.channel = CHANNEL;
		pending[cmd.cid] = callback||vfn;
		process.send(cmd);
	}

	var fns = {
		set(key,item,ttl,callback) {
			if(typeof(ttl)=="function") {callback = ttl; ttl = null;}
			else {ttl = parseInt(ttl) || null;}
			callback = callback || vfn;

			send({op:"set",args:[key,item,ttl]},callback);
		},
		get(path,callback) {
			send({op:"get",args:[path]},callback);
		},
		del(path,callback) {
			send({op:"del",args:[path]},callback);
		}
	}

	module.exports = fns;
}
