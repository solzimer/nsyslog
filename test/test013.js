const cluster = require('cluster');
const cpuUsage = require('../lib/cpu');

if(cluster.isMaster) {
  cluster.fork();
}

let MAX = 80;
let STOP = false;

cpuUsage.on('cpuload',(usage)=>{
  console.log(cluster.isMaster,usage);
  if(usage.total>MAX) 
    STOP = true;
  else
    STOP = false;
});

if(!cluster.isMaster) {
  async function loadCpu() {
    while(true) {
      if(STOP) {
        console.log("PAUSED!");
      }
      else {
        console.log('CAÑA DE ESPAÑA');
        let k=0;
      
        for(let i=0;i<10000;i++)
          for(let j=0;j<10000;j++)
            k++;
      }

      await new Promise(ok=>setTimeout(ok,100));
    }
  }

  loadCpu();
}
