const
	fork = require('child_process').fork,
	extend = require('extend'),
	isMaster = process.env["NODE_FORKED"]!="true";

function forkChild(module,args,opts) {
	return fork(module,args,extend(true,{},opts,{
		env : {NODE_FORKED:"true"}
	}));
}

module.exports = {
	isMaster, fork:forkChild
}
