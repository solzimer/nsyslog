## Transportador Redis

Envía datos a través de un canal Redis.

## Ejemplos

```json
"transporters" : {
	"redis" : {
		"type" : "redis",
		"config" : {
			"url" : ["redis://host1:6379","redis://host2:6379"],
			"format" : "${JSON}",
			"channel" : "nsyslog"
		}
	}
}
```

## Parámetros de configuración
* **url** : Punto(s) de conexión Redis (por ejemplo, `redis://host:puerto`).
* **format** : Expresión de salida del mensaje que se envía.
* **channel** : Canal de publicación Redis (admite expresiones).
