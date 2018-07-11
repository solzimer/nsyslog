const
	cluster = require('../lib/cluster'),
	wm = require('../lib/watermark');

async function init() {
	if(cluster.isMaster) {
		cluster.fork(`${__dirname}/test_watermark.js`,[]);
	}
	else {
		console.log("child start");
		let data = await wm.get('file');
		console.log(data);
	}
}

init();
