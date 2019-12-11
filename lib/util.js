const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat')
dayjs.extend(customParseFormat)

if(!Date.prototype.format) {
		Date.prototype.format = function(mask) {
			dayjs(this).format(mask);
		}
}

module.exports = {
	date : dayjs,
	vfn() {},
	prfn(obj,cmd) {
		return new Promise((ok,rej)=>obj[cmd](err=>err?rej(err):ok()));
	},
	timer(time) {
		return time>0?
			new Promise(ok=>setTimeout(ok,time)) :
			new Promise(ok=>setImmediate(ok));
	},
	immediate() {
		return new Promise(ok=>setImmediate(ok));
	}
}
