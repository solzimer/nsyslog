const
	logger = require('../logger'),
	Input = require('./'),
	net = require('net');

const DEFAULTS = {
	host : "0.0.0.0",
	port : 514,
	protocol : "tcp4"
}

const BUFFER_TO = 100;
const BUFFER_IVAL = 100;

class TCPServer extends Input {
	constructor(id) {
		super(id);
		this.server = null;
		this.ival = null;
	}

	configure(config) {
		config = config || {};
		this.host = config.host || DEFAULTS.host;
		this.port = config.port || DEFAULTS.port;
		this.protocol = config.protocol || DEFAULTS.protocol;
		this.eserver = {protocol:this.protocol, port:this.port, host:this.host};
		this.paused = false;
	}

	parse(sdata,message) {
		return {
			originalMessage : message,
			server : eserver,
			client : {address : sdata.addr}
		};
	}

	start(callback) {
		const RX = /<\d+>/g;
		const RXPRI = /<\d+>/g;
		var sockets = [];

		this.ival = setInterval(()=>{
			let tf = Date.now();
			for(let sid in sockets) {
				let s = sockets[sid];
				if((tf-s.t)>=BUFFER_TO) {
					if(s.buffer.length) {
						callback(parse(s,s.buffer));
					}
					s.buffer = "";
				}
			}
		},BUFFER_IVAL);

		this.server = net.createServer(sock => {
			if(this.paused) return;

			var s = {t:Date.now(),buffer:"",msg:"",sock:sock,addr:sock.remoteAddress};
			var sid = `${s.t}_${Math.random()*1000}`;
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
				logger.error("tcp input error: " + err.message)
			});

		}).listen(this.port, this.host);

		this.server.on('error',(err)=>{
			logger.error(err);
		});
	}

	stop(callback) {
		clearInterval(this.ival);
		this.server.close(callback);
	}

	pause(callback) {
		this.paused = true;
	}

	resume(callback) {
		this.paused = false;
	}
}

module.exports = TCPServer;
