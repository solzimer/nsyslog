const
	logger = require('../logger'),
	Input = require('./'),
	net = require('net');

const DEFAULTS = {
	host: "0.0.0.0", // Default host address
	port: 514, // Default port
	protocol: "tcp4" // Default protocol
};

const BUFFER_TO = 100; // Buffer timeout in milliseconds
const BUFFER_IVAL = 100; // Buffer interval in milliseconds

/**
 * TCPServer class for handling TCP-based input.
 * Extends the base Input class.
 */
class TCPServer extends Input {
	/**
	 * Constructor for TCPServer.
	 * @param {string} id - Unique identifier for the input.
	 * @param {string} type - Type of the input.
	 */
	constructor(id, type) {
		super(id, type);
		this.server = null; // TCP server instance
		this.ival = null; // Interval for buffer processing
	}

	/**
	 * Configures the TCPServer with the provided settings.
	 * 
	 * @param {Object} config - Configuration object containing:
	 * @param {string} [config.host="0.0.0.0"] - Host address to bind to.
	 * @param {number} [config.port=514] - Port to listen on.
	 * @param {string} [config.protocol="tcp4"] - Protocol to use (e.g., "tcp4").
	 * @param {Function} callback - Callback function to signal completion.
	 */
	configure(config, callback) {
		config = config || {};
		this.host = config.host || DEFAULTS.host;
		this.port = config.port || DEFAULTS.port;
		this.protocol = config.protocol || DEFAULTS.protocol;
		this.eserver = {protocol:this.protocol, port:this.port, host:this.host};
		this.paused = false;
		callback();
	}

	/**
	 * Parses incoming data and constructs a message object.
	 * 
	 * @param {Object} sdata - Socket data containing client information.
	 * @param {string} message - Raw message received from the client.
	 * @returns {Object} Parsed message object.
	 */
	parse(sdata, message) {
		return {
			originalMessage : message,
			server : eserver,
			client : {address : sdata.addr}
		};
	}

	/**
	 * Starts the TCPServer and begins listening for incoming connections.
	 * 
	 * @param {Function} callback - Callback function to process incoming messages.
	 */
	start(callback) {
		const RX = /<\d+>/g;
		const RXPRI = /<\d+>/g;
		var sockets = {};

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
				logger.error("tcp input error: " + err.message);
			});

		}).listen(this.port, this.host);

		this.server.on('error',(err)=>{
			logger.error(err);
		});
	}

	/**
	 * Stops the TCPServer and cleans up resources.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	stop(callback) {
		clearInterval(this.ival);
		this.server.close(callback);
	}

	/**
	 * Pauses the TCPServer, preventing further processing of incoming connections.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	pause(callback) {
		this.paused = true;
	}

	/**
	 * Resumes the TCPServer, allowing processing of incoming connections.
	 * 
	 * @param {Function} callback - Callback function to signal completion.
	 */
	resume(callback) {
		this.paused = false;
	}
}

module.exports = TCPServer;
