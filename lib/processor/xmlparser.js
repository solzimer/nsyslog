const
	extend = require("extend"),
	Processor = require("./"),
	xml = require('xml2js').parseString,
	Semaphore = require("../semaphore"),
	logger = require("../logger"),
	jsexpr = require("jsexpr");

let wsupport = true;
try {require('worker_threads');}catch(err) {wsupport = false;}

if(wsupport) {
	var {Worker, isMainThread, parentPort, workerData} = require('worker_threads');
	logger.info('CSV parser: Multithread is enabled');
}
else {
	isMainThread = true;
	logger.warn('CSV parser: Multithread is disabled');
}

const XML_OPTS = {
	explicitArray:false,
	mergeAttrs:true
};

function parse(str) {
	return new Promise((ok,rej)=>{
		xml(str,XML_OPTS,(err,json)=>err?rej(err):ok(json));
	});
}

if(isMainThread) {
	class XMLParserProcessor extends Processor {
		constructor(id) {
			super(id);
			this.workers = [];
			this.seq = 0;
			this.xmlstr = "";
		}

		configure(config,callback) {
			this.config = extend({},config);
			this.output = jsexpr.assign(this.config.output || "splitted");
			this.input = jsexpr.expr(this.config.input || "${originalMessage}");
			this.tag = this.config.tag || null;
			this.multiline = this.config.multiline || false;
			this.cores = parseInt(config.cores) || 0;
			this.multicore = wsupport && this.cores && !this.multiline;

			if(this.tag!=null) {
				this.rx = new RegExp(`<${this.tag}[ >]((?!<\/${this.tag}>).)*<\/${this.tag}>`,'gm');
			}
			else {
				this.rx = /(.*)/m;
			}

			if(this.multicore) {
				for(let i=0;i<this.cores;i++) {
					let worker = new Worker(__filename);
					worker.on("message",msg=>{
						let pr = worker.pr;
						this.input(pr.entry,msg.res);
						pr.callback(msg.err,pr.entry);
						pr.sem.leave();
					});
					worker.pr = {sem:new Semaphore(1), callback:null, entry:null};
					worker.postMessage({tag : this.tag});
					this.workers.push(worker);
				}
			}

			callback();
		}

		start(callback) {
			callback();
		}

		async parse(entry,matches,callback) {
			try {
				let all = await Promise.all(matches.map(parse));
				this.output(entry,all);
				callback(null,entry);
			}catch(err) {
				callback(err,entry);
			}
		}

		async process(entry,callback) {
			let msg = this.input(entry);

			if(!this.multicore) {
				if(this.multiline) {
					this.xmlstr += msg;
					let matches = this.xmlstr.match(this.rx);
					if(!matches) callback();
					else {
						this.xmlstr = "";
						this.parse(entry, matches, callback);
					}
				}
				else {
					let matches = msg.match(this.rx);
					if(!matches) callback();
					else this.parse(entry, matches, callback);
				}
			}
			else {
				let id = this.seq++;
				let worker = this.workers[id%this.cores];
				await worker.pr.sem.take();
				worker.pr.callback = callback;
				worker.pr.entry = entry;
				worker.postMessage(msg);
			}
		}
	}

	module.exports = XMLParserProcessor;
}
else {
	var multiline = false;
	var xmlstr = "";
	var first = true;

	function send(err,res) {
		res = (res || [])[0];
		parentPort.postMessage({err,res});
	}

	parentPort.on('message',msg=>{
		if(first) {
			options = msg;
			first = false;
		}
		else {
			parse(msg,options,send);
		}
	});
}
