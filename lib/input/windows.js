const
	Input = require('.'),
    extend = require('extend'),
    nwinread = require('nwinread'),
    Watermark = require("../watermark"),
    xml = require('xml2js').parseString,
    logger = require('../logger'),
    Queue = require('../queue');

const READMODE = {
    start: nwinread.START_MODE.BEGINNING,
    end: nwinread.START_MODE.END,
    offset: nwinread.START_MODE.WATERMARK
}

const FORMAT = {
    xml: 'xml',
    json: 'json'
};

const XML_OPTS = {
	explicitArray: false,
	mergeAttrs: true
};

/**
 * WindowsInput class for reading Windows Event Logs.
 * Extends the base Input class.
 */
class WindowsInput extends Input {
	seq = 0;
    buffer = null;

	/**
	 * Constructor for WindowsInput.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the WindowsInput with the provided settings.
	 * 
	 * @param {Object} config - Configuration object containing:
	 * @param {string} [config.channel="Application"] - Event log channel to read from.
	 * @param {string} [config.readmode="offset"] - Read mode (offset or watermark).
	 * @param {string|number} [config.offset] - Offset for reading events.
	 * @param {number} [config.batchsize=100] - Number of events to fetch in each batch.
	 * @param {string} [config.query] - Query to filter events.
	 * @param {string} [config.format="json"] - Format of the output (json or xml).
	 * @param {Array<number>} [config.idfilter] - Array of event IDs to filter.
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async configure(config, callback) {
		config = config || {};

		this.idfilter = config.idfilter || [];
        this.channel = config.channel || "Application";
        this.batchsize = Math.max(1,Math.min(1000,config.batchsize || 100));
        this.query = config.query || null;
        this.format = config.format || "json";
        this.buffer = new Queue(this.batchsize*2);
        this.parser = new EventParser(this.format);
        await this.#setupWatermark(config);
        logger.debug(this.wm);
        callback();
	}

    async #setupWatermark(config) {
		this.watermark = new Watermark(config.$datadir);
		await this.watermark.start();
		this.wm = await this.watermark.get(this.id);
        
        // De cara al API, siempre leemos en modo offset, y el watermark se encarga 
        // de gestionar el offset o el watermark real según la configuración
        this.wm.startmode = READMODE.offset;

        // Si el modo del reader es "offset" o el watermark almacenado no tiene offset, 
        // se configura el offset según la configuración
        if(config.readmode=="offset" || !this.wm.offset) {
            if(config.offset=="start") {
                this.wm.offset = 0;
            }
            else if(config.offset=="end") {
                let res = nwinread.readEvents(this.channel, READMODE.end, 0, 1, null);
                this.wm.offset = res.lastRecordId;
            }
            else if(!isNaN(config.offset)) {
                this.wm.offset = parseInt(config.offset);
            }
        }
        // Si el modo es watermark, intentamos cargar el watermark almacenado, y si no existe, 
        // se empieza desde el offset configurado
        else if(config.readmode=="watermark") {
            if(!this.wm.offset) {
                if(config.offset=="start") {
                    this.wm.offset = 0;
                }
                else if(config.offset=="end") {
                    let res = nwinread.readEvents(this.channel, READMODE.end, 0, 1, null);
                    this.wm.offset = res.lastRecordId;
                }
                else if(!isNaN(config.offset)) {
                    this.wm.offset = parseInt(config.offset);
                }
            }
        }

        this.wm.channel = this.channel;
        this.wm.idfilter = this.idfilter;
        await this.watermark.save(this.wm);
    }

	/**
	 * Returns the mode of the input.
	 * @returns {string} The mode of the input (pull).
	 */
	get mode() {
		return Input.MODE.pull;
	}

	async read() {
        const offset = this.wm.offset;
        const channel = this.wm.channel;
        const idfilter = this.idfilter && this.idfilter.length? this.idfilter : null;

        logger.debug(`Reading events from channel ${channel} starting at offset ${offset} with idfilter ${idfilter}`);
        const result = nwinread.readEvents(channel, READMODE.offset, offset, this.batchsize, idfilter);
        const lastOffset = result.lastRecordId;
        for(let event of result.records) {
            await this.buffer.push(event);
        }
        this.wm.offset = lastOffset;
        await this.watermark.save(this.wm);
	}

	/**
	 * Retrieves the next event from the queue.
	 * 
	 * @param {Function} callback - Callback function to process the next event.
	 */
	async next(callback) {
        while(!this.buffer.size()) {
            try {
                await this.read();
            }catch(e) {
                logger.error(`Error reading events from channel ${this.channel}: ${e.message}`);
                return callback(e);
            }

            if(!this.buffer.size()) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        try {
            const event = await this.buffer.pop();
            const parsed = await this.parser.feed(event.xml);
            callback(null, {channel: this.channel, eventRecordId: event.recordId, originalMessage: parsed});
        }catch(e) {
            callback(e);
        }
	}

	/**
	 * Starts the WindowsInput and begins reading events.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async start(callback) {
		callback();
	}

	/**
	 * Stops the WindowsInput and performs cleanup.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async stop(callback) {
		callback();
	}

	/**
	 * Pauses the WindowsInput, saving the current watermark state.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async pause(callback) {
		callback();
	}

	/**
	 * Resumes the WindowsInput.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async resume(callback) {
		callback();
	}
}

class EventParser {
    format = FORMAT.xml;

    constructor(format) {
        this.format = format || FORMAT.xml;
    }

    async feed(line) {
        if(this.format!=FORMAT.json) {
            return {Event:lines[i]};
        }
        else {
            let json = await new Promise((ok,rej)=>{                    
                xml(line,XML_OPTS,(err,json)=>err?ok({err}):ok(json));
            });

            if(!json) return {err: new Error("Failed to parse XML")};
            if(json.err) return json;

            let newTs = json.Event?.System?.TimeCreated?.SystemTime;
            json.Event.SystemTime = newTs;

            // Fix EventID
            if(json.Event?.System?.EventID?._) {
                json.Event.System.Qualifiers = json.Event?.System?.EventID?.Qualifiers;
                json.Event.System.EventID = json.Event?.System?.EventID?._;
            }

            // Remap eventdata for easy processing
            let edata = json.Event?.EventData?.Data;
            if(typeof(edata)=='string') {
                json.Event.EventData.Data = {Message:edata};
            }
            else if(Array.isArray(edata)){
                json.Event.EventData.Data = edata.reduce((map,item,i)=>{
                    if(item.Name)	map[item.Name] = item._;
                    else map[i] = item;
                    return map;
                }, {});
            }
            return json;
        }
    }
}

module.exports = WindowsInput;
