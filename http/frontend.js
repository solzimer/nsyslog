const
	express = require('express');
	try {
		shm = require('../lib/sharedmem.js');
	}catch(err) {
		console.log(err);
	}

const app = express();

app.get('/fstats', function (req, res) {
	shm.get('fstats', (err, value) => {
		console.log(err,value);
		res.send(value);
	});
});

app.listen(3000, function () {
  console.log('Worker listening on port 3000!')
});
