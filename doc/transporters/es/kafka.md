## Transportador Kafka

Envía datos a través del broker de mensajes Apache Kafka.

## Ejemplos

Envía a un clúster de Kafka con roundrobin en las particiones del tema.

```json
"transporters" : {
	"kafka" : {
		"type" : "kafka",
		"config" : {
			"url" : ["kafka://host1:9092","kafka://host2:9092"],
			"format" : "${originalMessage}",
			"topic" : "nsyslog_topic",
			"mode" : "roundrobin"
		}
	}
}
```

Envía a un clúster de Kafka (protocolo seguro), utilizando un campo hash para distribuir la carga en cada partición.

```json
"transporters" : {
	"kafka" : {
		"type" : "kafka",
		"config" : {
			"url" : ["kafkas://host1:9092","kafkas://host2:9092"],
			"format" : "${originalMessage}",
			"topic" : "nsyslog_topic",
			"mode" : "hashed",
			"field" : "${severity}",
			"tls" : {
				"rejectUnauthorized" : false
			}
		}
	}
}
```

## Parámetros de configuración
* **url** : Endpoint de Kafka (proto://host:port/path), donde *proto* puede ser kafka o kafkas.
* **format** : Expresión de salida del mensaje que se envía.
* **topic** : Tema de Kafka (admite expresiones).
* **mode** : Modo de balanceo de particiones del tema:
	* roundrobin : Mecanismo simple de roundrobin.
	* hashed : La partición se asigna utilizando un hash numérico de un campo de entrada.
	* fixed : La partición se asigna utilizando un campo numérico.
* **field** : Expresión de campo a utilizar en el modo *hashed* o *fixed*.
* **tls** : Opciones TLS como se describe en la [documentación de NodeJS](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options).
