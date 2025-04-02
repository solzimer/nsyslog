## Entrada Syslog

La entrada Syslog coloca un servidor que escucha mensajes syslog. Admite varios protocolos de transporte, pero no analiza las líneas recibidas. Si deseas realizar un análisis de syslog, puedes usar el [procesador de análisis syslog](../processors/syslogparser.md).

## Ejemplos

Servidor Syslog UDP con control de flujo en el búfer

```json
"inputs" : {
	"syslog" : {
		"type" : "syslog",
		"maxPending" : 1000,
		"buffer" : true,
		"config" : {
			"url" : "udp://0.0.0.0:514"
		}
	}
}
```

Servidor Syslog TCP sin control de flujo en el búfer

```json
"inputs" : {
	"syslog" : {
		"type" : "syslog",
		"maxPending" : 1000,
		"buffer" : false,
		"config" : {
			"url" : "tcp://0.0.0.0:514"
		}
	}
}
```

Servidor Syslog TLS seguro con clave privada y certificado

```json
"inputs" : {
	"syslog" : {
		"type" : "syslog",
		"maxPending" : 1000,
		"config" : {
			"url" : "tls://0.0.0.0:1514",
			"tls" : {
				"key" : "./config/server.key",
				"cert" : "./config/server.crt",
				"rejectUnauthorized" : false
			}
		}
	}
}
```

## Parámetros de configuración
* **url** : Patrón de enlace de URL del servidor. Toma la forma de *&lt;protocolo&gt;://&lt;host de enlace&gt;:&lt;puerto de enlace&gt;*. Los protocolos permitidos son: **udp**, **udp6**, **tcp**, **tcp6**, **tls** y **tls6**.
* **maxPending** : Número máximo de mensajes pendientes en el búfer. Por defecto es `1000`.
* **buffer** : Booleano. Si es `true`, habilita el almacenamiento en búfer de los mensajes entrantes.
* **tls** : Objeto pasado al socket del servidor TLS, como se describe en la [documentación de NodeJS](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options). Incluye:
  - **key** : Ruta al archivo de clave privada.
  - **cert** : Ruta al archivo de certificado.
  - **rejectUnauthorized** : Booleano. Si es `false`, permite certificados autofirmados.

## Salida
Cada mensaje syslog generará un objeto con el siguiente esquema:
```javascript
{
	id : '<ID de entrada>',
	type : 'syslog',
	timestamp : Date.now(),
	originalMessage : '<mensaje syslog>',
	server : {
		protocol : '<protocolo de enlace>',
		port : '<puerto de enlace>',
		host : '<host de enlace>'
	},
	client : {
		address : '<dirección del cliente>',
		port : '<puerto del cliente>' // Se añadió el puerto del cliente para mayor detalle
	}
}
```
