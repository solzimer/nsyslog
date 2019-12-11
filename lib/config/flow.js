const extend = require('extend');
const DEF_CNF = {
	fork : false,
	disabled : false,
	fparent : null,
	from : "*",
	when : "true",
	processors : [],
	transporters : [],
};

var SEQ = 0;

/**
 * NSyslog Flow
 * @class
 * @memberof Config
 * @description <p>NSyslog flow defines a process where data entries are selected, processed and transported</p>
 * @param {string} id FLow ID
 * @param {object} def Flow options
 */
class Flow {
	constructor(id, def) {
		def = Object.assign({},DEF_CNF,def);
		/** @property {string} id Flow ID */
		this.id = id || `Flow_${SEQ++}`;
		/** @property {boolean} disabled Flow is disabled */
		this.disabled = def.disabled;
		/** @property {boolean|string} fork Forked flow */
		this.fork = def.fork;
		/** @property {boolean} fork Virtual flow */
		this.virtual = def.virtual;
		/** @property {string} fparent Parent flow ID */
		this.fparent = def.fparent;
		/** @property {string|object} from Flow from expression */
		this.from = typeof(def.from)=="object"? extend(true,{},def.from) : def.from;
		/** @property {string|object} when Flow when expression */
		this.when = typeof(def.when)=="object"? extend(true,{},def.when) : def.when;
		/** @property {array<string>} processors Flow processors */
		this.processors = def.processors;
		/** @property {array<string>} transporters Flow transporters */
		this.transporters = def.transporters;

		/**
		 * @property {object} pstream Flow initial and final streams
		 * @property {stream} pstream.start Initial stream
		 * @property {stream} pstream.end Final stream
		 */
		this.pstream = {
			start : null,
			end : null
		};
	}
}

module.exports = Flow;
