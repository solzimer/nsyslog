## Entrada ZeroMQ

La entrada ZeroMQ crea un cliente ZeroMQ para consumir mensajes de un publicador. Soporta dos modos: `pull` y `sub`. Los mensajes pueden procesarse en formato bruto o JSON.

## Ejemplos

### Ejemplo 1: ZMQ en modo `sub`, suscrito a un canal específico
```json
"inputs": {
	"zmq": {
		"type": "zmq",
		"config": {
			"url": "tcp://127.0.0.1:9999",
			"mode": "sub",
			"channel": "my_channel",
			"format": "json"
		}
	}
}
```

### Ejemplo 2: ZMQ en modo `pull`
```json
"inputs": {
	"zmq": {
		"type": "zmq",
		"config": {
			"url": "tcp://127.0.0.1:8888",
			"mode": "pull",
			"format": "raw"
		}
	}
}
```

### Ejemplo 3: ZMQ en modo `sub` con suscripción a canales con comodines
```json
"inputs": {
	"zmq": {
		"type": "zmq",
		"config": {
			"url": "tcp://127.0.0.1:7777",
			"mode": "sub",
			"channel": "logs_*",
			"format": "json"
		}
	}
}
```

## Parámetros de configuración

- **url**:  
  La URL de conexión para el socket ZeroMQ. Ejemplo: `tcp://127.0.0.1:9999`.

- **mode**:  
  El modo de operación.  
  - **pull**: Se conecta a un socket `PUSH` para recibir mensajes.  
  - **sub**: Se conecta a un socket `PUB` y se suscribe a un canal específico.

- **channel**:  
  El canal al que suscribirse (solo aplicable en modo `sub`). Soporta nombres de canal exactos o patrones con comodines.

- **format**:  
  Especifica el formato del mensaje.  
  - **raw**: El contenido bruto del mensaje se coloca en el campo `originalMessage`.  
  - **json**: El contenido del mensaje se analiza como un objeto JSON y se coloca en el campo `originalMessage`.

## Salida

Cada mensaje recibido de ZeroMQ genera un objeto con el siguiente esquema:
```javascript
{
	id: '<ID de entrada>',
	type: 'zmq',
	mode: '<sub o pull>',
	url: '<URL de conexión>',
	originalMessage: '<datos en bruto u objeto JSON>',
	topic: '<nombre del canal>' // Solo presente en modo `sub`
}
```

### Notas:
- Si el `format` está configurado como **json**, la entrada intentará analizar el contenido del mensaje como JSON. Si el análisis falla, se registrará una advertencia y se devolverá el mensaje en bruto.
- El campo `topic` solo está presente en el modo `sub` e indica el nombre del canal desde el que se recibió el mensaje.
- El modo `pull` no utiliza canales y procesa todos los mensajes entrantes.
