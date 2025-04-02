## Transportador Syslog

Envía datos a través del protocolo syslog.

## Ejemplos

Envía el mensaje a través de syslog UDP estándar.

```json
"transporters" : {
	"syslog" : {
		"type" : "syslog",
		"config" : {
			"url" : "udp://localhost:514",
			"format" : "${originalMessage}",
			"application" : "${filename}",
			"hostname" : "localhost",
			"level" : "info",
			"facility" : 5
		}
	}
}
```

Envía a través de syslog TCP, un mensaje por conexión.

```json
"transporters" : {
	"syslog" : {
		"type" : "syslog",
		"config" : {
			"url" : "tcp://localhost:514",
			"format" : "${originalMessage}",
			"application" : "${filename}",
			"hostname" : "localhost",
			"level" : "info",
			"facility" : 5,
			"stream" : false
		}
	}
}
```

Envía a través de syslog TLS seguro, en modo stream (múltiples mensajes en la misma conexión).

```json
"transporters" : {
	"syslog" : {
		"type" : "syslog",
		"config" : {
			"url" : "tls://localhost:514",
			"format" : "${originalMessage}",
			"application" : "${filename}",
			"hostname" : "localhost",
			"level" : "info",
			"facility" : 5,
			"stream" : true,
			"tls" : {
				"key" : "./config/server.key",
				"cert" : "./config/server.crt"
			}			
		}
	}
}
```

## Parámetros de configuración
* **url** : URL de conexión (proto://puerto), donde *proto* puede ser:
	* udp : Protocolo UDP.
	* tcp : Protocolo TCP.
	* tls : Protocolo TCP a través de TLS/SSL seguro.
* **format** : Expresión de salida del mensaje enviado.
* **application** : Etiqueta de aplicación del encabezado syslog (admite expresiones).
* **hostname** : Etiqueta de nombre de host del encabezado syslog (admite expresiones).
* **level** : Parte *Level* de la etiqueta *priority* del encabezado syslog. Admite nombre o número, como se describe en [esta tabla](https://en.wikipedia.org/wiki/Syslog#Severity_level) (admite expresiones).
* **facility** : Parte *Facility* de la etiqueta *priority* del encabezado syslog. Admite nombre o número, como se describe en [esta tabla](https://en.wikipedia.org/wiki/Syslog#Facility) (admite expresiones).
* **stream** : Cuando el protocolo es *tcp* o *tls*, los mensajes pueden enviarse uno por conexión o en modo stream, donde se utiliza la misma conexión para enviar múltiples mensajes y evitar la sobrecarga del flujo *connect-send-close* en cada mensaje. Activar solo si el servidor syslog soporta el modo stream.
* **tls** : Opciones TLS como se describe en la [documentación de NodeJS](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options).
