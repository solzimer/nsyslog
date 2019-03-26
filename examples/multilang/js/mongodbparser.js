const {BasicBolt} = require('./storm');

const LEVELS = {
	F	: 5,
	E	: 4,
	W	: 3,
	I	: 1,
	D	: 0
}

class MongoDBParserBolt extends BasicBolt {
	constructor() {
		super();
	}

	initialize(conf, context, callback) {
		callback();
	}

	emitcallback() {

	}

	process(tup, done) {
		let line = tup.values[0].split(" ").filter(l=>l.trim().length);
		let event = {};

		event.timestamp = Date.parse(line.shift());
		event.sev = LEVELS[line.shift()];
		event.ct1 = event.type = line.shift();
		event.ct2 = (line.shift()||"").replace(/\[|\]/g,'');

		this.emit({tuple: [event], anchorTupleId: tup.id},this.emitcallback);
		done();
	}
}

if(module.parent) {
	module.exports = MongoDBParserBolt;
}
else {
	new MongoDBParserBolt().run();
}

/*
--- TEST DATA ----

2018-10-02T15:24:19.933+0200 I NETWORK  [conn683] end connection 127.0.0.1:47086 (62 connections now open)
2018-10-02T15:24:19.933+0200 I NETWORK  [listener] connection accepted from 127.0.0.1:47090 #685 (63 connections now open)
2018-10-02T15:24:19.933+0200 I NETWORK  [conn685] received client metadata from 127.0.0.1:47090 conn: { driver: { name: "mongo-java-driver", version: "3.6.0" }, os: { type: "Linux", name: "Linux", architecture: "amd64", version: "3.10.0-693.17.1.el7.x86_64" }, platform: "Java/Oracle Corporation/1.8.0_161-b12" }
2018-10-02T15:25:08.113+0200 I NETWORK  [conn684] end connection 127.0.0.1:47088 (62 connections now open)
2018-10-02T15:25:08.114+0200 I NETWORK  [listener] connection accepted from 127.0.0.1:47096 #686 (63 connections now open)
2018-10-02T15:25:08.114+0200 I NETWORK  [conn686] received client metadata from 127.0.0.1:47096 conn: { driver: { name: "mongo-java-driver", version: "3.6.0" }, os: { type: "Linux", name: "Linux", architecture: "amd64", version: "3.10.0-693.17.1.el7.x86_64" }, platform: "Java/Oracle Corporation/1.8.0_161-b12" }
2018-10-02T15:25:19.933+0200 I NETWORK  [conn685] end connection 127.0.0.1:47090 (62 connections now open)
2018-10-02T15:25:19.934+0200 I NETWORK  [listener] connection accepted from 127.0.0.1:47098 #687 (63 connections now open)
2018-10-02T15:25:19.934+0200 I NETWORK  [conn687] received client metadata from 127.0.0.1:47098 conn: { driver: { name: "mongo-java-driver", version: "3.6.0" }, os: { type: "Linux", name: "Linux", architecture: "amd64", version: "3.10.0-693.17.1.el7.x86_64" }, platform: "Java/Oracle Corporation/1.8.0_161-b12" }
2018-10-02T15:26:08.112+0200 I NETWORK  [conn686] end connection 127.0.0.1:47096 (62 connections now open)
2018-10-02T15:26:08.113+0200 I NETWORK  [listener] connection accepted from 127.0.0.1:47100 #688 (63 connections now open)
2018-10-02T15:26:08.113+0200 I NETWORK  [conn688] received client metadata from 127.0.0.1:47100 conn: { driver: { name: "mongo-java-driver", version: "3.6.0" }, os: { type: "Linux", name: "Linux", architecture: "amd64", version: "3.10.0-693.17.1.el7.x86_64" }, platform: "Java/Oracle Corporation/1.8.0_161-b12" }
2018-10-02T15:26:19.933+0200 I NETWORK  [conn687] end connection 127.0.0.1:47098 (62 connections now open)
2018-10-02T15:26:19.933+0200 I NETWORK  [listener] connection accepted from 127.0.0.1:47102 #689 (63 connections now open)
2018-10-02T15:26:19.933+0200 I NETWORK  [conn689] received client metadata from 127.0.0.1:47102 conn: { driver: { name: "mongo-java-driver", version: "3.6.0" }, os: { type: "Linux", name: "Linux", architecture: "amd64", version: "3.10.0-693.17.1.el7.x86_64" }, platform: "Java/Oracle Corporation/1.8.0_161-b12" }
2018-10-02T15:27:08.112+0200 I NETWORK  [conn688] end connection 127.0.0.1:47100 (62 connections now open)
2018-10-02T15:27:08.112+0200 I NETWORK  [listener] connection accepted from 127.0.0.1:47106 #690 (63 connections now open)
2018-10-02T15:27:08.114+0200 I NETWORK  [conn690] received client metadata from 127.0.0.1:47106 conn: { driver: { name: "mongo-java-driver", version: "3.6.0" }, os: { type: "Linux", name: "Linux", architecture: "amd64", version: "3.10.0-693.17.1.el7.x86_64" }, platform: "Java/Oracle Corporation/1.8.0_161-b12" }
2018-10-02T15:27:19.934+0200 I NETWORK  [conn689] end connection 127.0.0.1:47102 (62 connections now open)
*/
