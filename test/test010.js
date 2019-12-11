const moment = require('moment');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);
const val1 = (new Date()).toISOString();
const val2 = new Date();
const val3 = "12/10/2019 12:34:00";
const MAX = 100000;

function perf(name,fn,val,format) {
	let ti = Date.now();
	for(let i=0;i<MAX;i++) {
		fn(val,format);
	}
	let tf = Date.now();
	console.log(name,tf-ti,fn(val,format).format('YYYY-MM-DD HH:mm:ss'));
}

perf('moment',moment,val1);
perf('dayjs',dayjs,val1);

perf('moment',moment,val2);
perf('dayjs',dayjs,val2);

perf('moment',moment,val3,"DD/MM/YYYY HH:mm:ss");
perf('dayjs',dayjs,val3,"DD/MM/YYYY HH:mm:ss");
