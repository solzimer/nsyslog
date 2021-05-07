const 
    fs = require('fs-extra'),
    path = require('path'),
    Shm = require('../shm'),
    logger = require('../logger'),
    {timer} = require('../util'),
    chokidar = require('chokidar');

class GlobalDB {
    constructor(datadir) {
        this.file = path.resolve(datadir,'global.json');
        this.watcher = chokidar.watch(path.resolve(datadir,'global.json'));
        this.watcher.on('all',(event, path)=>{
            logger.warn('GlobalDB file ',this.file, 'has changed');
            this.reloadDatabase();
        });
    }

    async reloadDatabase() {
        try {
            await timer(500);
            let raw = await fs.readFile(this.file, 'utf-8');
            let json = JSON.parse(raw);

            Object.keys(json).forEach(k=>{
                Shm.hset('global',k,json[k]);
            });
        }catch(err) {
            logger.error(err);
        }
    }
}

module.exports = GlobalDB;