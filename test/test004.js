// pubber.js
var zmq = require('zeromq')
  , sock = zmq.socket('pub');

sock.bindSync('tcp://192.168.134.49:9999');
console.log('Publisher bound to port 9999');

setInterval(function(){
  console.log('sending a multipart message envelope');
  sock.send(['test', JSON.stringify({a:"paco",b:"pedro"})]);
	//sock.send(JSON.stringify({a:"paco",b:"pedro"}));
}, 10);
