const
	nativefork = require('child_process').fork,
	extend = require('extend'),
	logger = require('../logger'),
	isMaster = process.env["NODE_FORKED"]!="true";

const handlers = {};
const children = [];

if(!isMaster) {
	process.on('message',msg=>msgHandler(process,msg));
}

function fork(module,args,opts) {
	let child = nativefork(
		module || "./",args,
		extend(true,{},opts,{env : {NODE_FORKED:"true"}})
	);

	child.on('message',msg=>msgHandler(child,msg));
	return child;
}

function on(module, child, handler) {
	if(!handler) {
		handler = child;
		child = null;
	}
	handlers[module] = handlers[module] || [];
	handlers[module].push({child,handler});
}

function off(module, child, handler) {
	let hdls = handlers[module] || [];
	let idx = hdls.findIndex(hdl=>hdl.handler==handler && hdl.child==child);
	if(idx>=0) hdls.splice(idx,1);
}

function msgHandler(child,msg) {
	let module = msg.module;

	if(module && handlers[module]) {
		handlers[module].forEach(hdl=>{
			try {
				if(!hdl.child || hdl.child==child)
					hdl.handler(child,module,msg);
			}catch(err) {
				logger.error(err);
			}
		});
	}
}

module.exports = {isMaster, fork, on, off}
