const
	express = require('express'),
	memored = require('memored');

const app = express();

app.get('/fstats', function (req, res) {
	memored.read('fstats', (err, value) => {
		console.log(err,value);
		res.send(value);
	});
});

app.listen(3000, function () {
  console.log('Worker listening on port 3000!')
});
