const
	NODE_FORKED = 'NODE_FORKED',
	nativefork = require('child_process').fork,
	extend = require('extend'),
	isMaster = process.env[NODE_FORKED]!="true";

const handlers = {};
const children = {};

/**
 * Base cluster message
 * @memberof cluster
 * @class
 */
class Message {
	/**
	 * Creates a new cluster message
	 * @param {Object} props Message properties. Must include at least:
	 * @param {string} props.module Target module name
	 */
	constructor(props) {
		props = Object.assign({module:'module'},props);

		/**
		 * Target module name
		 * @type {String}
		 */
		this.module = props.module;

		for(let k in props) {
			this[k] = props[k];
		}
	}
};

/**
 * Message listener template
 * @memberof cluster
 * @param {ChildProcess} child Child process
 * @param {string} module Module identifier
 * @param {cluster.Message} msg Message
 */
function fhandler(child, module, msg) {}

if(!isMaster) {
	process.on('message',msg=>msgHandler(process,msg));
}

/**
 * Forks a new process with the specified script
 * @memberof cluster
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
 * @memberof cluster
 * @param {string} module Module identifier
 * @param {ChildProcess} [child] Child process to subscribe
 * @param {cluster.fhandler} handler Listener handler
 */
function on(module, child, handler) {
	if(!handler) {
		handler = child || fhandler;
		child = null;
	}
	handlers[module] = handlers[module] || [];
	handlers[module].push({child,handler});
}

/**
 * Removes a subscription to child messages
 * @memberof cluster
 * @param {string} module Module identifier
 * @param {ChildProcess} [child] Child process to subscribe
 * @param {cluster.fhandler} handler Listener handler
 */
function off(module, child, handler) {
	if(!handler) {
		handler = child || fhandler;
		child = null;
	}
	let hdls = handlers[module] || [];
	let idx = hdls.findIndex(hdl=>hdl.handler==handler && hdl.child==child);
	if(idx>=0) hdls.splice(idx,1);
}

/**
 * Removes all subscriptions to messages from a module
 * @memberof cluster
 * @param {string} module Module identifier
 */
function removeAllListeners(module) {
	if(module) handlers[module] = [];
	else Object.keys(handlers).forEach(h=>delete handlers[h]);
}

/**
 * Broadcast a message to all children
 * @memberof cluster
 * @param {string} module Module identifier
 * @param {cluster.Message} msg Message
 */
function broadcast(module,msg) {
	Object.keys(children).forEach(pid=>{
		children[pid].send(extend(msg,{module}));
	});
}

function msgHandler(child,msg) {
	let module = msg.module;
	let hdls = handlers[module] || [];

	if(module) {
		let len = hdls.length;
		for(let i=0;i<len;i++) {
			let hdl = hdls[i];
			try {
				if(hdl && (!hdl.child || hdl.child==child))
					hdl.handler(child,module,msg);
			}catch(err) {
				console.error(err);
			}
		}
	}
}

/**
 * NSyslog Cluster module
 * @namespace cluster
 */
module.exports = {
	Message,
	isMaster,
	fork,
	on,
	off,
	removeAllListeners,
	broadcast
};
