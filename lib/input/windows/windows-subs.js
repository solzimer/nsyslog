const
	Input = require('..'),
    nwinread = require('nwinread'),
    Watermark = require("../../watermark"),
    EventParser = require('./event-parser'),
    logger = require('../../logger'),
    Queue = require('../../queue');

const MAX_ID_FILTER = 20; // Maximum number of IDs to filter in a single nwinread call, if more, we split in batches of this size
const READMODE = {
    start: nwinread.START_MODE.BEGINNING,
    end: nwinread.START_MODE.END,
    offset: nwinread.START_MODE.WATERMARK
}

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
        this.batchsize = Math.max(1,Math.min(100,config.batchsize || 100));
        this.query = config.query || null;
        this.format = config.format || "json";
        this.buffer = new Queue(this.batchsize*2);
        this.parser = new EventParser(this.format);

        this.subsIds = [];
        this.wmival = null;
        await this.#setupWatermark(config);
        logger.debug(this.wm);
        callback();
	}

    async #setupWatermark(config) {
		this.watermark = Watermark.getInstance(config.$datadir);
        //this.watermark = new Watermark(config.$datadir);
		await this.watermark.start();
		this.wm = await this.watermark.get(this.id);

        // Hay que actualizar a la nueva versión del reader,
        // para evitar problemas con versiones anteriores
        if(this.wm.version!='2.0') {
            logger.info(`Upgrading watermark for input ${this.id} to version 2.0`);
            this.wm = {_id: this.id, version: '2.0'};
        }
                
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
                try {
                    let res = nwinread.readEvents(this.channel, READMODE.end, 0, 1, null);
                    this.wm.offset = res.lastRecordId;
                }catch(err) {
                    logger.error(`Error getting last record ID for channel ${this.channel}: ${err.message}`);
                    this.wm.offset = 0;
                }
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
                    try {
                        let res = nwinread.readEvents(this.channel, READMODE.end, 0, 1, null);
                        this.wm.offset = res.lastRecordId;
                    }catch(err) {
                        logger.error(`Error getting last record ID for channel ${this.channel}: ${err.message}`);
                        this.wm.offset = 0;
                    }
                }
                else if(!isNaN(config.offset)) {
                    this.wm.offset = parseInt(config.offset);
                }
            }
        }

        this.wm.channel = this.channel;
        this.wm.idfilter = this.idfilter;
        await this.watermark.save(this.wm);
        logger.info("Windows Watermark Configured", this.id, this.wm);
    }

	/**
	 * Returns the mode of the input.
	 * @returns {string} The mode of the input (push).
	 */
	get mode() {
		return Input.MODE.push;
	}

	async read(callback) {
        const offset = this.wm.offset;
        const channel = this.wm.channel;
        const idfilter = this.idfilter && this.idfilter.length? this.idfilter : null;
        let lastRecordId = offset;
        let batches = [];

        // El filtro de IDS puede ser muy grande, y nwinread puede tener problemas con filtros grandes, 
        // así que si el filtro es mayor a MAX_ID_FILTER, lo dividimos en batches de MAX_ID_FILTER
        if(idfilter && idfilter.length>MAX_ID_FILTER) {
            // split idfilter in batches of MAX_ID_FILTER to avoid issues with nwinread
            for(let i=0; i<idfilter.length; i+=MAX_ID_FILTER) {
                batches.push(idfilter.slice(i, i+MAX_ID_FILTER));
            }
        }
        else {
            batches = [this.idfilter||null]; // single batch with no filter
        }
       
        const onEvent = async (event) => {
            lastRecordId = event.recordId;
            const parsed = await this.parser.feed(event.xml);
            const data = {channel: this.channel, eventRecordId: event.recordId, originalMessage: parsed}
            callback(null, data);
        }

        const onError = (err) => {
            logger.error(`Error in nwinread subscription for channel ${channel}: ${err.message}`);
            callback(err);
        }

        this.subsIds = [];
        batches.forEach(batch => {
            try {
                const subsId = nwinread.subscribe(channel, offset, onEvent, onError, batch, 2);
                this.subsIds.push(subsId);
            }catch(err) {
                logger.error(`Error creating nwinread subscription for channel ${channel} with offset ${offset} and idfilter ${batch}: ${err.message}`);
            }
        });

        this.wmival = setInterval(async () => {
            if(this.wm.offset != lastRecordId) {
                this.wm.offset = lastRecordId;
                await this.watermark.save(this.wm);
                logger.debug("Windows Watermark Updated", this.id, this.wm);
            }
        }, 5000);
	}

	/**
	 * Retrieves the next event from the queue.
	 * 
	 * @param {Function} callback - Callback function to process the next event.
	 */
	async next(callback) {
        callback(new Error("Next method not implemented for WindowsInput, as it operates in push mode. Use the callback in the read method to process events."));
	}

	/**
	 * Starts the WindowsInput and begins reading events.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async start(callback) {
		this.read(callback);
	}

	/**
	 * Stops the WindowsInput and performs cleanup.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	async stop(callback) {
        if(this.wmival) {
            clearInterval(this.wmival);
            this.wmival = null;
        }

        this.subsIds.forEach(subsId => {
            try {
                nwinread.stopSubscription(subsId);
            } catch (err) {
                logger.error(`Error stopping nwinread subscription for channel ${this.channel}: ${err.message}`);
            }
        });
        this.subsIds = [];

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

module.exports = WindowsInput;
