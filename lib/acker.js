const { events } = require("@elastic/elasticsearch");
const { EventEmitter } = require("events");

class Acker {
    constructor() {
        this.listeners = new Map();
    }

    on(id,callback) {
        this.listeners.set(id, callback);
    }

    off(id) {
        this.listeners.delete(id);
    }

    async ack(id, entry, msg) {
        if(this.listeners.has(id)) {
            let fn = this.listeners.get(id);
            await fn(entry, msg);
        }
    }

    static newInstance() {
        return new Acker();
    }
}

const DefaultAcker = new Acker;
module.exports = DefaultAcker;
