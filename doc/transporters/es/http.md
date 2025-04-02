## Transportador HTTP/S

Envía datos mediante el método post o put de HTTP/S.

## Ejemplos

```json
"transporters" : {
	"http" : {
		"type" : "http",
		"config" : {
			"url" : "http://foo.bar/logs/put",
			"method" : "put",
			"format" : "${originalMessage}",
			"headers" : {
				"Content-Type" : "application/json"
			}
		}
	}
}
```

## Parámetros de configuración
* **url** : Endpoint URL de HTTP/S (proto://host:port/path), donde *proto* puede ser http o https.
* **format** : Expresión de salida del mensaje que se envía.
* **method** : *post* o *put*.
* **headers** : Cabeceras adicionales que se enviarán en cada solicitud HTTP.
* **tls** : Opciones TLS como se describe en la [documentación de NodeJS](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options).
