const
	fs = require('fs-extra'),
	logger = require('../logger'),
	extend = require('extend');

DEF_CONF = {
	key : `${__dirname}/server.key`,
	cert : `${__dirname}/server.crt`,
	rejectUnauthorized : false
}

async function configure(options) {
	let opts = extend(true,{},DEF_CONF,options);

	logger.debug(`Loading tls key ${opts.key}`);
	opts.key = await fs.readFile(opts.key);
	logger.debug(`Loading tls cert ${opts.cert}`);
	opts.cert = await fs.readFile(opts.cert);
	return opts;
}

module.exports = {
	configure,
	DEFAULT : DEF_CONF
};
