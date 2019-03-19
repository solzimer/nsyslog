const
	fs = require('fs-extra'),
	logger = require('../logger'),
	Path = require('path'),
	extend = require('extend');

const DEF_CONF = {
	key : `${__dirname}/server.key`,
	cert : `${__dirname}/server.crt`,
	ca : null,
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

module.exports = {
	defaults,
	configure,
	DEFAULT : DEF_CONF
};
