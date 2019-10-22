module.exports = {
	vfn() {},
	prfn(obj,cmd) {
		return new Promise((ok,rej)=>obj[cmd](err=>err?rej(err):ok()));
	}
}
