const
	WebSocket = require('ws'),
	fs = require('fs');

const ws = new WebSocket('wss://127.0.0.1:3000',{
	key : fs.readFileSync('../config/server.key'),
	cert : fs.readFileSync('../config/server.crt'),
	rejectUnauthorized : false
});

ws.on('open', function open() {
  ws.send('something',err=>{
		console.log(err);
	});
});
