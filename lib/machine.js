const 
    extend = require('extend'),
    os = require('os'),
    oss = require('os-utils'),
    dns = require('dns'),    
    nodeDiskInfo = require('node-disk-info'),
    EventEmitter = require('events'),
    Shm = require('./shm');

const DEF_CONF = {
    key : 'ctx',
    ival : 30000
}

const EVENTS = {
    status : 'status'
};

var INSTANCE = null;

class MachineCollector extends EventEmitter {
    constructor() {
        super();

        this.key = DEF_CONF.key;
        this.ival = DEF_CONF.ival;
        this.to = null;
        this.hostname = os.hostname();
        this.error = false;
    }

    static get Event() {
        return EVENTS;
    }

    static get Defaults() {
        return DEF_CONF
    }
    
    static get default() {
        if(!INSTANCE) {
            INSTANCE = new MachineCollector();
        }
        return INSTANCE;
    }

    configure(options) {
        options = extend(true,{},DEF_CONF,options);
        
        this.ival = options.ival;
        this.key = options.key;
    }

    start() {
        this.loop();
    }

    stop() {
        clearTimeout(this.to);
        this.to = null;
    }

    async loop() {
        let res = await this.collectMachine();
        Shm.hset('global',this.key,res);
        this.emit('status',res);
        this.to = setTimeout(()=>this.loop(),this.ival);
    }

    async collectMachine() {
        let baseInfo = {
            hostname : os.hostname() || this.hostname || '-',
            platform : process.platform,
            arch : process.arch,
            cpu : os.cpus(),
            env : process.env,
            ifaces : Object.entries(os.networkInterfaces()).map(i=>({name:i[0],data:i[1]})),
            sip : await new Promise(ok=>dns.lookup(this.hostname,(err,addr,fam)=>ok(err?'':addr))),
            os : {
                version : os.version? os.version() : '-',
                release : os.release()
            },
            memory : {
                total : os.totalmem(),
                free : os.freemem()
            }            
        }

        if(!this.error) {
            let xtInfo = {};
            try {
                xtInfo = {
                    sysUpTime : oss.sysUptime(),
                    processUpTime : oss.processUptime(),
                    disk : await nodeDiskInfo.getDiskInfo(),
                    cpuLoad : {
                        min1:oss.loadavg(1),
                        min5:oss.loadavg(5),
                        min15:oss.loadavg(15)
                    }
                }
            }catch(err) {
                this.error = err.message;
            }
        }

        return Object.assign({},baseInfo,xtInfo,this.error?{error:this.error}:{});
    }
}

module.exports = MachineCollector;
