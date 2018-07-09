// pubber.js
var zmq = require('zeromq')
  , sock = zmq.socket('pull');

sock.connect('tcp://127.0.0.1:3000');
console.log('Publisher bound to port 9999');

sock.on('message',msg=>{
	console.log(`${msg}`);
});
