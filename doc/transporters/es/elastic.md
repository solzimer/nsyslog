## Transportador Elastic

Envía datos a un servidor o clúster de ElasticSearch.

## Ejemplos

Envía entradas de registro a un índice de ElasticSearch:

```json
"transporters" : {
	"elastic" : {
		"type" : "elastic",
		"config" : {
			"url" : ["http://host1:9200", "http://host2:9200"],
			"index" : "logs",
			"format" : "${JSON}",
			"headers" : {
				"Content-Type" : "application/json"
			},
			"options" : {
				"maxRetries" : 3,
				"requestTimeout" : 30000
			}
		}
	}
}
```

## Parámetros de configuración
* **url** : Endpoint(s) de ElasticSearch (por ejemplo, `http://host:port` o `https://host:port`).
* **index** : El índice de ElasticSearch a utilizar (admite expresiones).
* **format** : Expresión de salida del mensaje que se envía.
* **headers** : Cabeceras HTTP para las solicitudes (admite expresiones).
* **options** : Opciones adicionales para el cliente de ElasticSearch, tales como:
	* **maxRetries** : Número máximo de reintentos para solicitudes fallidas.
	* **requestTimeout** : Tiempo de espera para las solicitudes en milisegundos.
	* **sniffOnStart** : Indica si se debe inspeccionar el clúster al inicio.
* **tls** : Opciones TLS para conexiones seguras, como se describe en la [documentación de NodeJS](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options).
