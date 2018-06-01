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
			var root = store;

			if(typeof(ttl)=="function") {callback = ttl; ttl = null;}
			else {ttl = parseInt(ttl) || null;}
			callback = callback || vfn;

			path = path.replace(/ /g,"").split("/").filter(s=>s.length);
			while(path.length) {
				let folder = path.shift();
				if(!root[folder]) root[folder] = {};
				root = root[folder];
				if(!path.length) root[folder] = item;
			}
			callback(null,item,ttl);
		},
		get(path,callback) {
			var root = store;

			path = path.replace(/ /g,"").split("/").filter(s=>s.length);
			while(path.length && root) {
				let folder = path.shift();
				root = root[folder];
			}

			if(root) callback(null,root);
			else callback("Entry not found",null);
		},
		del(path,callback) {
			var root = store;
			var item = null;

			path = path.replace(/ /g,"").split("/").filter(s=>s.length);
			while(path.length && root) {
				let folder = path.shift();
				root = root[folder];
				if(root && !path.length) {
					item = root[folder];
					delete root[folder];
				}
			}

			if(item) callback(null,item);
			else callback("Entry not found",null);
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