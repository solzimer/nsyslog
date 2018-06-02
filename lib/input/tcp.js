const
	logger = require('../logger'),
	net = require('net'),
	moment = require("moment");

const DEFAULTS = {
	host : "0.0.0.0",
	port : 514,
	protocol : "tcp4"
}

const BUFFER_TO = 100;
const BUFFER_IVAL = 100;

function Server() {
	var host = DEFAULTS.host;
	var port = DEFAULTS.port;
	var protocol = DEFAULTS.protocol;
	var server = null;
	var eserver = {};
	var ival = null;

	function parse(sdata,message) {
		return {
			originalMessage : message,
			server : eserver,
			client : {address : sdata.addr}
		};
	}

	this.configure = function(config) {
		config = config || {};
		host = config.host || DEFAULTS.host;
		port = config.port || DEFAULTS.port;
		protocol = config.protocol || DEFAULTS.protocol;
		eserver = {protocol : protocol, port : port, interface : host};
	}

	this.start = function(callback) {
		const RX = /<\d+>/g;
		const RXPRI = /<\d+>/g;
		var sockets = [];

		ival = setInterval(()=>{
			var tf = Date.now();
			for(var sid in sockets) {
				var s = sockets[sid];
				if((tf-s.t)>=BUFFER_TO) {
					if(s.buffer.length) {
						callback(parse(s,s.buffer));
					}
					s.buffer = "";
				}
			}
		},BUFFER_IVAL);

		server = net.createServer(sock => {
			var s = {t:Date.now(),buffer:"",msg:"",sock:sock,addr:sock.remoteAddress};
			var sid = s.t + "_" + Math.random()*1000;
			s.sid = sid;
			sockets[sid] = s;

			sock.on('data', data => {
				s.t = Date.now();
				s.buffer += data.toString();

				// Cortar el trozo del principio que no tiene prioridad, en caso
				// de que estos mensajes sí la tengan (es un trozo inválido, lo ignoramos)
				var sidx = s.buffer.search(RX);
				if(sidx>0) s.buffer = s.buffer.substring(sidx);

				// Buscamos mensajes con prioridad
				var tpris = s.buffer.match(RXPRI);
				if(tpris!=null) {
					var lines = s.buffer.split(RXPRI);
					lines.shift();	// El primer elemento es vacio por la forma de separar
					// Leemos todas las lineas menos la última, que puede estar aun incompleta
					while(lines.length>1) {
						var line = tpris.shift()+lines.shift();
						callback(parse(line));
					}
					// Ahora el bugger solo tiene el ultimo trozo de linea
					s.buffer = tpris.shift()+lines.shift();
				}
			});

			sock.on('close', data => {
				// Se cierra antes de procesar todo el buffer pendiente
				// Así que cogemos el remanente y los separamos por los tokens
				// de prioridad
				var tpris = s.buffer.match(RXPRI);

				// Si no hay token, lo mandamos todo como una sola linea
				if(!tpris) {
					callback(parse(s.buffer));
				}
				else {
					// Ajustamos las longitudes de ambos arrays (quitamos el remanente del
					// principio del buffer, que no se corresponde con ningun mensaje)
					var tline = s.buffer.split(RXPRI);
					while(tline.length>tpris.length) tline.shift();
					tline.forEach((line,i)=>{
						line = tpris[i]+line;
						callback(parse(line));
					});
				}
				delete sockets[s.sid];
			});

			sock.on('error', err => {
				logger.error("Error => "+err.message)
			});

		}).listen(port, host);
	}

	this.stop = function(callback) {
		clearInterval(ival);
		server.close(callback);
	}
}

module.exports = Server;
