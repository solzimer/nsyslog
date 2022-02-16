const EventEmitter = require('events');

class CPULoad extends EventEmitter {
    static Event = {
        cpuload : 'cpuload'
    }

    static newInstance() {
        return new CPULoad();
    }
    
    constructor() {
        super();
        this.previousTime = new Date().getTime();
        this.previousUsage = process.cpuUsage();
        this.lastUsage;     
        this.Event = CPULoad.Event;   
        this.start();
    }

    start() {
        setInterval(() => {
            const currentUsage = process.cpuUsage(this.previousUsage);
        
            this.previousUsage = process.cpuUsage();
        
            // we can't do simply times / 10000 / ncpu because we can't trust
            // setInterval is executed exactly every 1.000.000 microseconds
            const currentTime = new Date().getTime();
            // times from process.cpuUsage are in microseconds while delta time in milliseconds
            // * 10 to have the value in percentage for only one cpu
            // * ncpu to have the percentage for all cpus af the host
        
            // this should match top's %CPU
            const timeDelta = (currentTime - this.previousTime) * 10;
            // this would take care of CPUs number of the host
            // const timeDelta = (currentTime - previousTime) * 10 * ncpu;
            const { user, system } = currentUsage;
        
            this.lastUsage = { system: system / timeDelta, total: (system + user) / timeDelta, user: user / timeDelta };
            this.previousTime = currentTime;
        
            this.emit('cpuload',this.lastUsage);
        }, 1000);
    }
}

module.exports = CPULoad.newInstance();

