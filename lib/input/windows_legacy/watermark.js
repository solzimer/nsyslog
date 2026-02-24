const fs = require('fs-extra');
const path = require('path');
const Watermark = require('../../watermark');
const logger = require('../../logger');
const jsexpr = require('jsexpr');
const {exec} = require("child_process");
const {MODE, OFFSET} = require('./constants');

const BM_TMPL = jsexpr.expr("<BookmarkList><Bookmark Channel='${channel}' RecordId='${rid}' IsCurrent='true'/></BookmarkList>");
const RX_RID = /RecordId='(\d+)'/;
/**
 * Checks if a file exists.
 * @param {string} file 
 * @returns {Promise<boolean>} - True if the file exists, false otherwise.
 */
async function fexists(file) {
    try {
        await fs.access(file);
        return true;
    } catch (err) {
        return false;
    }
}

class WindowsWatermark {
    /** @type {Watermark} */
    #instance = null;   // The watermark db container (physical file)
    #wm = null;         // The current watermark data for a key (id input) 
    id = null;          // Input id
    channel = null;     // Windows event channel name
    path = null;        // Path to the watermark file
    readmode = null;    // Read mode (offset or timestamp)
	offset = null;      // Offset for reading events

    constructor(options) {
		options = options || {};
        this.path = options.path;
        this.id = options.id;
        this.channel = options.channel || "Application";
        this.readmode = options.readmode || MODE.offset;
		this.offset = options.offset || OFFSET.end;

        this.#instance = Watermark.getInstance(this.path);
    }

    /**
     * Starts the watermark manager for a given input id.
     * @param {string} id - The input id.
     * @param {string} channel - The windows event channel name.
     * @returns {Promise<void>}
     */
    async start() {
        if (!this.#wm) {
            await this.#instance.start();
            this.#wm = await this.#instance.get(this.id);
        }
    }

    get wm() {
        return this.#wm[this.channel];
    }

	/**
	 * Initializes a new watermark for the input.
	 * @returns {Promise<Object>} Resolves to the initialized watermark object.
	 */
	async initWatermark() {
		let file = path.resolve(this.path,`watermarks/input/${this.id}_${Math.random()}.xml`);
		await fs.ensureFile(file);
		return {channel : this.channel,	bm : file};
	}

	/**
	 * Writes a watermark to the file system.
	 * 
	 * @param {Object} wm - Watermark object.
	 * @param {string|number} offset - Offset for the watermark.
	 * @returns {Promise<void>}
	 */
	writeWatermark(wm,offset) {
		offset = offset || this.offset;

		return new Promise(async(ok,rej)=>{
			if(offset==OFFSET.begin || offset==OFFSET.start || offset==OFFSET.end) {
				exec(`wevtutil qe "${wm.channel}" /c:1 "/SBM:${wm.bm}" /RD:${offset==OFFSET.end}`,async(err,stdout,stderr)=>{
					if(err) return rej({err,stderr});
					let xml = await fs.readFile(wm.bm,'utf-8');
					let rid = (xml.match(RX_RID)||[])[1] || 0;
					await fs.writeFile(wm.bm,BM_TMPL({channel:wm.channel,rid}),'utf-8');
					ok();
				});
			}
			else if(typeof(offset)=='number') {
				rid = offset;
				await fs.writeFile(wm.bm,BM_TMPL({channel:wm.channel,rid}),'utf-8');
				ok();
			}
			else if(typeof(offset)=='string') {
				let q = `/q:Event[System[TimeCreated[@SystemTime>'${offset}']]]`;
				exec(`wevtutil qe "${wm.channel}" "/SBM:${wm.bm}" /c:1 "${q}"`,async(err,stdout,stderr)=>{
					if(err) return rej({err,stderr});
					let xml = await fs.readFile(wm.bm,'utf-8');
					let rid = (xml.match(RX_RID)||[])[1] || 0;
					await fs.writeFile(wm.bm,BM_TMPL({channel:wm.channel,rid}),'utf-8');
					ok();
				});
			}
		});
	}    

    /**
     * Initializes and sets up the watermark value.
     * @param {boolean} reset 
     * @returns {Promise<void>}
     */
    async setup(reset) {
        let exists = true, // Check if the watermark already file exists
            flen = 0, 
            wm = null, 
            oldwm = null;	

        // Check if the watermark file exists and delete it if reset is true
		if(reset) {
			oldwm = this.#wm[this.channel];
			if(oldwm) {
				try {await fs.unlink(oldwm.bm);}catch(err) {}
			}
			delete this.#wm[this.channel];
		}

		// Check if the watermark exists in the database
        // If it doesn't exist, create a new watermark
		if(!this.#wm[this.channel]?.bm) {
			logger.debug(`[${this.id}] : Initialize watermark for Windows channel ${this.channel}`);
			wm = this.#wm[this.channel] = await this.initWatermark();
			exists = false;
		}
		else {
			logger.debug(`[${this.id}] : Watermark for Windows channel ${this.channel} exists in db`);
			wm = this.#wm[this.channel];
			exists = await fexists(wm.bm);
			if(exists) flen = (await fs.stat(wm.bm)).size;
			logger.debug(`[${this.id}] : File exists: ${exists} / ${flen}`);
			if(exists && flen) {
				logger.info(`[${this.id}] : Watermark is valid: ${exists} / ${flen}`);
			}
			else {
				logger.warn(`[${this.id}] : Watermark is not valid. Reinitializing: ${exists} / ${flen}`);
				wm = this.#wm[this.channel] = await this.initWatermark();
				exists = false;
			}
		}

		// Offset mode, ignore previous watermark
		if(this.readmode==MODE.offset || !exists) {
			await this.writeWatermark(wm,this.offset);
		}        
    }

    async save() {
        return await this.#instance.save(this.#wm);
    }
}

module.exports = WindowsWatermark;
