## Transportador ZeroMQ

Envía datos a través de ZeroMQ.

## Ejemplos

Envía a un endpoint ZeroMQ TCP push:

```json
"transporters" : {
	"push" : {
		"type" : "zmq",
		"config" : {
			"url" : "tcp://localhost:3000",
			"format" : "${originalMessage}",
			"mode" : "push"
		}
	}
}
```

Publica mensajes en un canal ZeroMQ:

```json
"transporters" : {
	"pub" : {
		"type" : "zmq",
		"config" : {
			"url" : "tcp://localhost:3000",
			"format" : "${originalMessage}",
			"mode" : "pub",
			"channel" : "my_channel"
		}
	}
}
```

## Parámetros de configuración
* **url** : Punto de conexión ZeroMQ (por ejemplo, `tcp://host:puerto`).
* **format** : Expresión de salida del mensaje enviado.
* **mode** : Modo del endpoint ZMQ:
	* **push** : Envía mensajes al servidor.
	* **pub** : Publica mensajes en un canal del servidor.
* **channel** : Si el modo es *pub*, expresión del canal para especificar el canal de destino.
