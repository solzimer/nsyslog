const
	fs = require('fs-extra'),
	logger = require('../logger'),
	Path = require('path'),
	extend = require('extend');

const DEF_CONF = {
	key : `${__dirname}/server.key`,
	cert : `${__dirname}/server.crt`,
	rejectUnauthorized : false
}

var DEF_PATH = __dirname;

async function defaults(options, path) {
	extend(DEF_CONF,options);
	DEF_PATH = path;
}

async function configure(options, path) {
	path = path || DEF_PATH;

	let opts = extend(true,{},DEF_CONF,options);
	let cpath = Path.resolve(path,opts.cert);
	let kpath = Path.resolve(path,opts.key);

	logger.debug(`Loading tls key ${kpath}`);
	opts.key = await fs.readFile(kpath);

	logger.debug(`Loading tls cert ${cpath}`);
	opts.cert = await fs.readFile(cpath);

	return opts;
}

module.exports = {
	defaults,
	configure,
	DEFAULT : DEF_CONF
};
