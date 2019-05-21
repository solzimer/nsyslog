const cluster = require('../lib/cluster');

if(cluster.isMaster) {
	const Shm = require('../lib/shm');
	cluster.fork("./test_shm.js",[]);

	setTimeout(()=>{
		Shm.hpush('fork','flow1',{data:'data1'});
		Shm.hpush('fork','flow1',{data:'data2'});
		Shm.hpush('fork','flow1',{data:'data3'});
	},1000);
}
else {
	const Shm = require('../lib/shm');
	setInterval(()=>{
		let res = Shm.hget('fork','flow1');
		console.log(res);
	},1000);
}
