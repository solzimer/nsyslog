const
	Processor = require("./"),
	tls = require('../tls'),
	crypto = require('crypto'),
	extend = require('extend'),
	jsexpr = require("jsexpr");

const DEF_CONF = {
	input : '${originalMessage}',
	output : 'hash',
	mode : 'hash',
	algorythm : 'sha256',
	encoding : 'base64',
	signature : "${signature}",
	password : "c$5%#23!r120H*4",
	tls : {}
};

const MODES = {
	hash:'hash',
	sign:'sign',
	verify:'verify',
	cipher:'cipher',
	decipher:'decipher',
	privateEncrypt:'privateEncrypt',
	privateDecrypt:'privateDecrypt',
	publicEncrypt:'publicEncrypt',
	publicDecrypt:'publicDecrypt',
};

/**
 * CryptoProcessor class for cryptographic operations on log data.
 * @extends Processor
 */
class CryptoProcessor extends Processor {
	/**
	 * Creates an instance of CryptoProcessor.
	 * @param {string} id - The processor ID.
	 * @param {string} type - The processor type.
	 */
	constructor(id, type) {
		super(id, type);
	}

	/**
	 * Configures the processor with the given configuration.
	 * @param {Object} config - The configuration object.
	 * @param {string} [config.input='${originalMessage}'] - The input field containing data to process.
	 * @param {string} [config.output='hash'] - The output field to store the result.
	 * @param {string} [config.mode='hash'] - The cryptographic mode (e.g., hash, sign, cipher).
	 * @param {string} [config.algorythm='sha256'] - The algorithm to use (e.g., sha256, aes-256-cbc).
	 * @param {string} [config.encoding='base64'] - The encoding for the output (e.g., base64, utf8).
	 * @param {string} [config.signature='${signature}'] - The signature field for verification.
	 * @param {string} [config.password='c$5%#23!r120H*4'] - The password for encryption/decryption.
	 * @param {Object} [config.tls={}] - TLS configuration for signing and encryption.
	 * @param {Function} callback - The callback function.
	 */
	async configure(config, callback) {
		this.config = extend(true,{},DEF_CONF,config);
		this.input = jsexpr.expr(this.config.input);
		this.signature = jsexpr.expr(this.config.signature);
		this.output = jsexpr.assign(this.config.output);
		this.mode = this.config.mode;
		this.algorythm = this.config.algorythm;
		this.encoding = this.config.encoding;
		this.password = this.config.password.padEnd(32,'#');
		console.log(this.password.length);
		this.tls = await tls.configure(this.config.tls);

		if(!MODES[this.mode]) {
			callback(`Crypto mode "${this.mode}" unknown or not supported`);
		}
		else {
			callback();
		}
	}

	/**
	 * Processes a log entry and applies cryptographic operations.
	 * @param {Object} entry - The log entry to process.
	 * @param {Function} callback - The callback function.
	 */
	process(entry,callback) {
		try {
			let data = this.input(entry);
			let res = "", iv = null;

			if(typeof(data)!='string')
				data = `${JSON.stringify(data)}`;

			switch(this.mode) {
				case MODES.hash :
					data = Buffer.from(data);
					let hash = crypto.createHash(this.algorythm);
					hash.update(data);
					this.output(entry,hash.digest(this.encoding));
					callback(null, entry);
					break;
				case MODES.sign :
					data = Buffer.from(data);
					let sign = crypto.sign(this.algorythm||null,data,this.tls.key);
					this.output(entry,sign.toString(this.encoding));
					callback(null, entry);
					break;
				case MODES.verify :
					data = Buffer.from(data);
					let signature = Buffer.from(this.signature(entry),this.encoding);
					res = crypto.verify(this.algorythm||null,data,this.tls.cert||tls.key,signature);
					this.output(entry,res);
					callback(null, entry);
					break;
				case MODES.privateEncrypt :
					data = Buffer.from(data);
					res = crypto.privateEncrypt(this.tls.key, data);
					this.output(entry, res.toString(this.encoding));
					callback(null, entry);
					break;
				case MODES.publicEncrypt :
					data = Buffer.from(data);
					res = crypto.publicEncrypt(this.tls.cert, data);
					this.output(entry, res.toString(this.encoding));
					callback(null, entry);
					break;
				case MODES.privateDecrypt :
					data = Buffer.from(data, this.encoding);
					res = crypto.privateDecrypt(this.tls.key, data);
					this.output(entry, res.toString('utf8'));
					callback(null, entry);
					break;
				case MODES.publicDecrypt :
					data = Buffer.from(data, this.encoding);
					res = crypto.publicDecrypt(this.tls.cert, data);
					this.output(entry, res.toString('utf8'));
					callback(null, entry);
					break;
				case MODES.cipher :
					data = Buffer.from(data);
					iv = crypto.randomBytes(16);
					let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.password), iv);
					let encrypted = cipher.update(data);
					encrypted = Buffer.concat([encrypted, cipher.final()]);
					res = iv.toString(this.encoding) + ':' + encrypted.toString(this.encoding);
					this.output(entry,res);
					callback(null, entry);
					break;
				case MODES.decipher :
					data = data.split(':');
			  	iv = Buffer.from(data.shift(), this.encoding);
			  	let encryptedText = Buffer.from(data.shift(), this.encoding);
			  	let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.password), iv);
			  	let decrypted = decipher.update(encryptedText);
			  	decrypted = Buffer.concat([decrypted, decipher.final()]);
					this.output(entry,decrypted.toString('utf8'));
					callback(null, entry);
					break;
				default :
					throw new Error(`Unknown crypto method (${this.mode})`);
			}
		}catch(err) {
			callback(err,entry);
		}
	}
}

module.exports = CryptoProcessor;
