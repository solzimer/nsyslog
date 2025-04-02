const
	Processor = require("./"),
	{date} = require('../util'),
	extend = require('extend'),
	jsexpr = require("jsexpr");

const DEF_CONF = {
	input : '${timestamp}',
	format : 'YYYY-MM-DD HH:mm:ss',
	output : 'date',
	fields : []
};

/**
 * DateformatProcessor class for formatting date fields in log entries.
 * @extends Processor
 */
class DateformatProcessor extends Processor {
	/**
	 * Creates an instance of DateformatProcessor.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {string} [config.input='${timestamp}'] - The input field to format.
	 * @param {string} [config.format='YYYY-MM-DD HH:mm:ss'] - The date format to apply.
	 * @param {string} [config.output='date'] - The output field to store the formatted date.
	 * @param {Array<Object>} [config.fields=[]] - Additional fields to format, each with its own format and output.
	 * @param {Function} callback - The callback function.
	 */
	configure(config, callback) {
		this.config = extend(true,{},DEF_CONF,config);
		this.field = jsexpr.expr(this.config.field || this.config.input);
		this.format = this.config.format;
		this.output = jsexpr.assign(this.config.output);
		this.fields = this.config.fields.map(f=>{
			return {
				format : f.format,
				output : jsexpr.assign(f.output)
			};
		});
		this.flen = this.fields.length;
		callback();
	}

	/**
	 * Processes a log entry and formats its date fields.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function.
	 */
	process(entry, callback) {
		let ts = date(this.field(entry));
		let res = ts.format(this.format);
		this.output(entry,res);

		// extra fields
		let fields = this.fields, flen = this.flen;
		for(let i=0;i<flen;i++) {
			let f = fields[i];
			f.output(entry,ts.format(f.format));
		}

		callback(null,entry);
	}
}

module.exports = DateformatProcessor;
