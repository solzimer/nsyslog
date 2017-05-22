const
    lineReader = require('line-reader'),
    moment = require("moment"),
    dgram = require('dgram'),
    net = require('net'),
    program = require("commander");

function sendFile(localAddr, sender) {
  lineReader.eachLine(program.file, (line, last, cb)=>{
		sender(line,last,line,()=>{
			if(program.interval) setTimeout(cb,program.interval);
			else cb();
		});
  });
}

program.version('0.0.1')
  .option('-m, --mode [mode]', 'tcp,tcps,udp')
	.option('-r, --rfc [rfc]', 'BSD,IETF')
  .option('-h, --host [mhost]', 'Syslog Host')
	.option('-p, --port [mport]', 'Syslog Port', parseInt)
	.option('-f, --file [file]', 'File')
	.option('-H, --addr [loacladdr]', 'Local Address')
	.option('-n, --name [name]', 'Program name')
	.option('-i, --interval [ival]', 'Interval', parseInt)
  .option('-P, --priority [priority]', 'Priority', parseInt)
	.parse(process.argv);

if(program.mode=="tcp") {
  var client = new net.Socket();
  client.connect(program.port||514, program.host||"localhost", ()=>{
    sendFile(program.addr || client.localAddress,(line,last,raw,cb)=>{
      client.write(line,()=>{
				console.log("Sent: ",program.host||"localhost",program.port||514,line);
				if(last) client.destroy();
				cb();
			});
    });
  });
}
else if(program.mode=="tcps") {
  sendFile(program.addr || client.localAddress,(line,last,raw,cb)=>{
		var client = new net.Socket();
		client.connect(program.port||514, program.host||"localhost", ()=>{
			client.write(line,()=>{
				console.log("Sent: ",program.host||"localhost",program.port||514,line);
				client.destroy();
				cb();
			});
		});
  });
}
else if(program.mode=="udp"){
  var client = dgram.createSocket("udp4");
  sendFile(program.addr || client.localAddress,(line,last,raw,cb)=>{
    var msg = new Buffer(line);
  	try {
  		client.send(msg, 0, msg.length, program.port||514, program.host||"localhost", err=>{
        console.log(err);
  			if(err)	client.close();
  			else console.log("Sent: ",program.host||"localhost",program.port||514,line);
  			if(last) client.close();
				cb();
  		});
  	}catch(error) {
      console.log(error);
  		try {client.close();}catch(e){}
  		client = dgram.createSocket("udp4");
  	}
  });
}
