const
	fs = require('fs-extra'),
	crypto = require('crypto'),
	logger = require('../logger'),
	Path = require('path'),
	extend = require('extend');

const DEF_CONF = {
	key : `${__dirname}/server.key`,
	cert : `${__dirname}/server.crt`,
	passphrase : null,
	ca : null,
	rejectUnauthorized : false
};

var DEF_PATH = __dirname;

/**
 * Overwrites {@link TLS.DEFAULT} properties
 * @memberof TLS
 * @param  {object} options TLS options ({@link https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options})
 * @param  {string} path Default files base path
 */
async function defaults(options, path) {
	extend(DEF_CONF,options);
	DEF_PATH = path;
}

/**
 * Merges a TLS options object with the {@link TLS.DEFAULT} one, and reads all
 * private key / certificate files.
 * @memberof TLS
 * @param  {object} options TLS/SSL options object
 * @param  {string} [path] Base path for files to be read
 * @return {Promise<object>} Configured options object
 */
async function configure(options, path) {
	path = path || DEF_PATH;

	let opts = extend(true,{},DEF_CONF,options);
	let cpath = Path.resolve(path,opts.cert);
	let kpath = Path.resolve(path,opts.key);

	logger.debug(`Loading tls key ${kpath}`);
	try {
		opts.key = await fs.readFile(kpath);
	}catch(err) {
		logger.warn('Using default tls key file',err);
		opts.key = await fs.readFile(`${__dirname}/server.key`);
	}

	logger.debug(`Loading tls cert ${cpath}`);
	try {
		opts.cert = await fs.readFile(cpath);
	}catch(err) {
		logger.warn('Using default tls cert file',err);
		opts.cert = await fs.readFile(`${__dirname}/server.crt`);
	}

	if(opts.ca) {
		try {
			let capath = Path.resolve(path,opts.ca);
			opts.ca = await fs.readFile(capath);
		}catch(err) {
			logger.warn('No tls CA file',err);
		}
	}

	return opts;
}

function encrypt(options, data) {
	let opts = extend(true,{},DEF_CONF,options);
	let cpath = options.cert? Path.resolve(opts.cert) : Path.resolve(DEF_PATH,opts.cert);
	logger.info(`Encryption using cert: ${cpath}`);

	let publicKey = fs.readFileSync(cpath, "utf8");
	let buffer = Buffer.from(data);
	let encrypted = crypto.publicEncrypt(publicKey, buffer);
	return encrypted.toString("base64");
}

function decrypt(options, data) {
	let opts = extend(true,{},DEF_CONF,options);
	let kpath = options.key? Path.resolve(opts.key) : Path.resolve(DEF_PATH,opts.key);
	logger.info(`Encryption using key: ${kpath}`);

	let privateKeyData = fs.readFileSync(kpath, "utf8");
	let privateKey = {key:privateKeyData,passphrase:opts.passphrase||undefined};
	var buffer = Buffer.from(data, "base64");
	var decrypted = crypto.privateDecrypt(privateKey, buffer);
	return decrypted.toString("utf8");
}

/**
 * @namespace TLS
 * @description Utility module for TLS/SSL configuration of components. It provides
 * common default options and internal private key and certificate files, so you
 * don't have to configure TLS options for yourself (for test purposes; in real
 * environment you should provide production ready certificates). Since node
 * TLS options require you to previously load certificate files and provide the
 * bynary buffer data, TLS module allows you to pass simply the file paths.
 * @example
 * const TLS = require('nsyslog/lib/tls');
 * const https = require('https');
 *
 * let tlsopts = await TLS.configure({
 * 	cert : 'cert.pem',
 * 	key : 'key.pem',
 * 	ca : ['ca.pem','cert.pem'],
 * 	passphrase : 'mykeypasswd'
 * }, '/path/to/files');
 *
 * https.createServer(tlsopts, (req, res) => {
 * 	res.writeHead(200);
 * 	res.end('hello world\n');
 * }).listen(8000);
 */
const TLS = {
	defaults,
	configure,
	encrypt,
	decrypt,

	/**
	 * @type {Object}
	 * @see https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options
	 * @description Default TLS options for SSL/TLS secure connections
	 */
	DEFAULT : DEF_CONF
};

module.exports = TLS;
