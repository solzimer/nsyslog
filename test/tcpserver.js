const net = require('net');

var server = net.createServer((sock)=>{
	sock.on('data', data => {
		console.log(`${data}`);
		sock.end();
	});
});

server.listen(1514, '127.0.0.1');
