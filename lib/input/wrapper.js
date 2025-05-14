/**
 * @file wrapper.js
 * @description Módulo que implementa un wrapper para los inputs de NSyslog, unificando la interfaz
 * para tipos de inputs "push" y "pull" y conectándolos con el sistema de procesamiento.
 */
const
	Input = require('./'),
	logger = require('../logger'),
	jsexpr = require('jsexpr'),
	mingo = require('mingo'),
	Stats = require('../stats'),
	Readable = require('stream').Readable,
	{FILTER_ACTION} = require('../constants'),
	{timer} = require('../util'),
	MODE = Input.MODE;

const stats = Stats.fetch('main');

/**
 * @function getFilter
 * @description Crea una función de filtro basada en la definición proporcionada
 * @private
 * @param {Object} def - Definición del input que contiene la configuración del filtro
 * @returns {Function|boolean} - Función de filtrado o false si no hay filtro definido
 */
function getFilter(def) {
	let filter = def.then.filter;

	if(filter) {
		// Si el filtro es un objeto, se utiliza mingo para crear una consulta MongoDB-like
		if(typeof(filter)=='object') {
			let query = new mingo.Query(filter);
			return (entry)=>query.test(entry);
		}
		// Si el filtro es una cadena, se evalúa como una expresión JavaScript usando jsexpr
		else if(typeof(filter)=='string') {
			try {
				return jsexpr.eval(filter);
			}catch(err) {
				// En caso de error en la expresión, se registra y se devuelve false
				logger.error(`Invalid expression '${filter}' will be ignored.`,err);
				return false;
			}
		}
		// Para cualquier otro tipo de filtro, se devuelve una función que siempre retorna el valor del filtro
		else {
			return ()=>filter;
		}
	}
	// Si no hay filtro definido, se devuelve false
	else {
		return false;
	}
}

/**
 * @function next
 * @description Convierte la API basada en callbacks del input a una basada en Promises
 * @private
 * @param {Input} input - La instancia de input a consultar
 * @returns {Promise<Object>} - Promise que resuelve al próximo objeto de datos del input
 */
function next(input) {
	// Convierte la función next() basada en callbacks a una basada en Promises
	// para facilitar el uso con async/await en el stream de lectura
	return new Promise((ok,rej)=>{
		input.next((err,data)=>{
			if(!err) ok(data);
			else rej(err);
		});
	});
}

/**
 * InputWrapper class
 * @extends Input
 * @description <p>InputWrapper is a special subclass of {@link Input} intended to work
 * within the NSyslog core engine. Since inputs can be either <b>push</b> or <b>pull</b>,
 * InputWrapper unifies both kinds of inputs to a single implementation that manages
 * both situations.</p>
 * <p>But that's not the only thing it does. Its other task is to push read entries to
 * the NSyslog input stream, in order to be processed by the flows.</p>
 * @example
 * const InputWrapper = require('nsyslog').Core.InputWrapper;
 * const {BypassStream, QueueStream} = require('nsyslog').Core.Streams;
 *
 * let pushWrapper = new InputWrapper(myPushInput);
 * let pullWrapper = new InputWrapper(myPullInput);
 * pushWrapper.start(buffer)
 *
 * @param {Input} input Input instance
 */
class InputWrapper extends Input {
	constructor(input) {
		super(input.id,input.type);
		/** @property {Input} input Input instance */
		this.input = input;
		/** @property {Input} instance Input instance (again) */
		this.instance = input;
		/**
		 * @protected
		 * @property {Stream} stream Internal stream (only for pull inputs)
		 */
		this.stream = null;
		/**
		 * @protected
		 * @property {Stream} queueStream Output stream where input will be piped to
		 */
		this.queueStream = null;
	}

	/**
	 * Starts the input
	 * @param  {Duplex}   queueStream Duplex stream to pipe read entries
	 * @param  {Function} callback    Callback function
	 */	start(queueStream,callback) {
		// Obtiene referencias al input y su configuración
		let input = this.input;
		let def = input.$def;
		
		// Configura el filtro según la definición, o null si el input está deshabilitado
		let filter = def.disabled? null : getFilter(def);
		
		// Determina las acciones a tomar cuando el filtro coincide o no coincide
		// con valores predeterminados si no están especificados
		let filterMatch = FILTER_ACTION[def.then.match] || FILTER_ACTION.process;
		let filterNoMatch = FILTER_ACTION[def.then.nomatch] || FILTER_ACTION.block;
		// MODO PULL: Creamos un stream propio que activamente solicita datos del input
		if(input.mode==MODE.pull) {
			// Creamos un stream legible en modo objeto con un límite máximo de pendientes
			let stream = new Readable({
				objectMode:true,
				highWaterMark:def.maxPending,
				// Implementación del método _read que será llamado cuando el consumidor necesite más datos
				async read() {					// Bucle infinito para continuar solicitando datos mientras el stream esté activo
					while(true) {
						try {
							// Solicita el siguiente objeto del input
							let obj = await next(input);
							
							// Si no hay objeto o tiene un timer definido, espera un tiempo antes de reintentar
							if(!obj || (obj.$$timer!==undefined)) {
								await timer(obj.$$timer || 100);
							}
							else {
								// Enriquece el objeto con metadatos del input
								obj.input = input.id;
								obj.type = input.type;
								obj.$key = input.key(obj);								
								
								// Aplica la lógica de filtrado:
								
								// Caso 1: No hay filtro configurado, se envía el objeto directamente
								if(!filter) {
									return this.push(obj);
								}
								// Caso 2: El filtro evaluado sobre el objeto da true
								else if(filter && filter(obj)) {
									// Se envía el objeto solo si la acción para coincidencias no es bloquear
									if(filterMatch!=FILTER_ACTION.block) {
										return this.push(obj);
									}
								}
								// Caso 3: El filtro evaluado sobre el objeto da false
								else if(filter && !filter(obj)) {
									// Se envía el objeto solo si la acción para no-coincidencias no es bloquear
									if(filterNoMatch!=FILTER_ACTION.block) {
										return this.push(obj);
									}
								}
							}						}catch(err) {
							// Registra el error en las estadísticas
							stats.fail('input',input.id);
							// Espera 5 segundos antes de reintentar (evita bucles de error rápidos)
							await timer(5000);
						}
					}
				}
			});			
			// Guarda referencias al stream y queueStream para poder controlarlos más tarde
			this.stream = stream;
			this.queueStream = queueStream;
			// Mantiene una referencia al input original en el stream
			this.stream.instance = input;

			// Inicia el input subyacente
			input.start((err)=>{
				// Si hay error, emite un evento para notificarlo
				if(err) this.emit('stream_error',err);
				// Registra cada entrada en las estadísticas
				stream.on('data',data=>stats.emit('input',input.id));
				// Conecta el stream al destino proporcionado
				stream.pipe(queueStream);
			});
		}		
		// MODO PUSH: El input notificará asíncronamente cuando tenga datos disponibles
		else {
			// No necesitamos crear un stream, el input enviará los datos directamente
			this.stream = null;
			this.queueStream = queueStream;

			// Inicia el input subyacente, que llamará al callback con cada objeto recibido
			input.start((err,obj)=>{				
				// Si hay error, se registra en las estadísticas
				if(err) {
					stats.fail('input',input.id);
				}
				else {
					// Enriquece el objeto con metadatos del input, igual que en el modo pull
					obj.input = input.id;
					obj.type = input.type;
					obj.$key = input.key(obj);					// Aplica la misma lógica de filtrado que en el modo pull:
					
					// Caso 1: No hay filtro configurado, se envía el objeto directamente
					if(!filter) {
						stats.emit('input',input.id);
						queueStream.write(obj);
					}
					// Caso 2: El filtro evaluado sobre el objeto da true
					else if(filter && filter(obj)) {
						if(filterMatch!=FILTER_ACTION.block) {
							stats.emit('input',input.id);
							queueStream.write(obj);
						}
					}
					// Caso 3: El filtro evaluado sobre el objeto da false
					else if(filter && !filter(obj)) {
						if(filterNoMatch!=FILTER_ACTION.block) {
							stats.emit('input',input.id);
							queueStream.write(obj);
						}
					}
				}
			});
			callback();
		}
	}
	/**
	 * @method pause
	 * @description Pausa la lectura de datos del input
	 * @param {Function} callback - Función de callback a llamar cuando la pausa se complete
	 */	pause(callback) {
		// Si existe un stream (modo pull), lo pausa para detener la lectura
		if(this.stream) {
			this.stream.pause();
			//this.stream.unpipe();
		}
		// Notifica al input subyacente que debe pausarse
		this.input.pause(callback);
	}
	/**
	 * @method resume
	 * @description Reanuda la lectura de datos del input
	 * @param {Function} callback - Función de callback a llamar cuando la reanudación se complete
	 */	resume(callback) {
		// Si existe un stream (modo pull), reconecta el pipe y reanuda la lectura
		if(this.stream) {
			this.stream.pipe(this.queueStream);
			//this.stream.resume();
		}
		// Notifica al input subyacente que debe reanudar la lectura
		this.input.resume(callback);
	}
	/**
	 * @method stop
	 * @description Detiene el input y libera los recursos asociados
	 * @param {Function} callback - Función de callback a llamar cuando la detención se complete
	 * @returns {Promise<void>} - Promise que se resuelve cuando el input se detiene
	 */	async stop(callback) {
		// Si existe un stream (modo pull), desconecta el pipe para detener el flujo de datos
		if(this.stream) {
			this.stream.unpipe();
		}
		try {
			// Detiene el input subyacente y espera a que termine
			await this.input.stop(err=>{
				// Registra la detención correcta del input
				logger.info(`Input ${this.input.id} stopped`);
				callback(err);
			});
		}catch(err) {
			// Registra errores durante la detención del input
			logger.error(`Input ${this.input.id} abnormal stop`,err);
			callback(err);
		}
	}
}

module.exports = InputWrapper;
