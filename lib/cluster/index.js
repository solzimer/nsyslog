const
	nativefork = require('child_process').fork,
	extend = require('extend'),
	logger = require('../logger'),
	isMaster = process.env["NODE_FORKED"]!="true";

const handlers = {};
const children = {};
const Message = {module:'module'};

/**
 * Message listener template
 * @param {ChildProcess} child Child process
 * @param {string} module Module identifier
 * @param {Message} msg Message
 */
function handler(child, module, msg) {}

if(!isMaster) {
	process.on('message',msg=>msgHandler(process,msg));
}

/**
 * Forks a new process with the specified script
 * @param {string} module Script path
 * @param {Array<string>} args Script arguments
 * @param {object} opts fork options
 */
function fork(module,args,opts) {
	let child = nativefork(
		module || "./",args||[],
		extend(true,{},opts||{},{env : {NODE_FORKED:"true"}})
	);

	children[child.pid] = child;
	child.on('message',msg=>msgHandler(child,msg));
	child.on('close',()=>delete children[child.pid]);
	return child;
}

/**
 * Subscribe to child messages
 * @param {string} module Module identifier
 * @param {ChildProcess} [child] Child process to subscribe
 * @param {handler} handler Listener handler
 */
function on(module, child, handler) {
	if(!handler) {
		handler = child;
		child = null;
	}
	handlers[module] = handlers[module] || [];
	handlers[module].push({child,handler});
}

/**
 * Removes a subscription to child messages
 * @param {string} module Module identifier
 * @param {ChildProcess} [child] Child process to subscribe
 * @param {handler} handler Listener handler
 */
function off(module, child, handler) {
	let hdls = handlers[module] || [];
	let idx = hdls.findIndex(hdl=>hdl.handler==handler && hdl.child==child);
	if(idx>=0) hdls.splice(idx,1);
}

/**
 * Removes all subscriptions to messages from a module
 * @param {string} module Module identifier
 */
function removeAllListeners(module) {
	if(module) handlers[module] = [];
	else handlers = {};
}

/**
 * Broadcast a message to all children
 * @param {string} module Module identifier
 * @param {Message} msg Message
 */
function broadcast(module,msg) {
	Object.keys(children).forEach(pid=>{
		children[pid].send(extend(msg,{module}));
	});
}

function msgHandler(child,msg) {
	let module = msg.module;
	let hdls = handlers[module] || [];

	if(module && hdls) {
		let len = hdls.length;
		for(let i=0;i<len;i++) {
			let hdl = hdls[i];
			try {
				if(hdl && (!hdl.child || hdl.child==child))
					hdl.handler(child,module,msg);
			}catch(err) {
				logger.error(err);
			}
		};
	}
}

module.exports = {isMaster, fork, on, off, removeAllListeners, broadcast}
