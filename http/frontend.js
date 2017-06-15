const
	express = require('express'),
	shm = require('../lib/sharedmem.js');

const app = express();

var shmRoute = express.Router();
shmRoute.get('*',(req, res) => {
	shm.get(`${req.baseUrl}`, (err, value) => {
		console.log(err,value);
		res.send(value);
	});
});

app.use('/fstats/*', shmRoute);
app.listen(3000, function () {
  console.log('Worker listening on port 3000!')
});
