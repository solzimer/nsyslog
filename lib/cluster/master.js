const
	cmd = require('./cmd'),
	os = require('os'),
	zmq = require('zeromq'),
	extend = require('extend'),
	fork = require('child_process').fork,
	sockPush = zmq.socket('push'),
	sockPull = zmq.socket('pull');

let cpus = 1;//os.cpus().length;
let children = [];
let pmap = {};

sockPush.bindSync('tcp://127.0.0.1:0');
sockPull.connect(sockPush.last_endpoint);
sockPull.on('message', handle);

for(let i=0;i<cpus;i++) {
	let child = fork(`${__dirname}/worker.js`);
	children.push(child);

	child.on('message',msg=>{
		let pid = msg.pid;
		pmap[pid] = extend(pmap[pid],{pid});

		if(msg.cmd==cmd.ENDPOINT) {
			if(!pmap[pid].sock) {
				console.log('MASTER',`Received EP from ${pid} to => ${msg.endpoint}`);
				let push = zmq.socket('push');
				let pull = zmq.socket('pull');
				push.connect(msg.endpoint);
				pull.connect(msg.endpoint);
				pmap[pid] = extend({endpoint:msg.endpoint,push,pull});
				pull.on('message', handle);

				child.send({
					pid : process.pid,
					cmd : cmd.ENDPOINT,
					endpoint : sockPush.last_endpoint
				});
			};
		}

		children.forEach(child=>{
			child.send({pid, cmd:cmd.ENDPOINT,endpoint:msg.endpoint});
		});
	});
}

function handle(msg) {
	console.log(`[${process.pid}]: Message: ${msg}`);
}

setInterval(()=>{
	console.log("sending...");
	let pids = Object.keys(pmap);
	if(!pids.length) return;
	let pid = pids[Math.floor(Math.random()*pids.length)];
	pmap[pid].push.send('CACA!',err=>{
		console.log(err);
	});
},10);
