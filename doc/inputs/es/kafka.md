## Entrada Kafka

La entrada Kafka permite leer varios temas de Kafka simultáneamente, así como monitorizar temas para detectar nuevos que coincidan con los patrones seleccionados.

## Ejemplos

Suscripción a Kafka al patrón 'logline__.\*'. Buscará nuevos temas que coincidan con el patrón.
```json
"inputs" : {
	"kafka" : {
		"type" : "kafka",
		"config" : {
			"url" : ["kafka://servidor1:9092","kafka://servidor2:9092"],
			"topics" : ["/logline__.*/"],
			"format" : "json",
			"offset" : "earliest",
			"group" : "nsyslog",
			"watch" : true,
			"debug" : false,
			"options" : {
				"sessionTimeout" : 15000,
				"requestTimeout" : 10000
			}
		}
	}
}
```

## Parámetros de configuración
* **url** : Cadena o array de cadenas. Lista de hosts de Kafka a los que conectarse (kafka://host:puerto o kafkas://host:puerto para conexión TLS).
* **topics** : Cadena o array. Lista de temas de Kafka a los que suscribirse. Si un tema está entre caracteres '/', se interpretará como una expresión regular para coincidir.
* **format** : Puede ser **raw** o **json**. Cuando se usa **raw**, el contenido bruto del mensaje se colocará en el campo 'originalMessage' de la entrada. De lo contrario, si se usa **json**, el contenido se analizará como un objeto JSON y se colocará en el campo 'originalMessage'.
* **offset** : Puede ser **earliest** o **latest**. Desplazamiento inicial al comenzar a leer un nuevo tema.
* **group** : ID del grupo de consumidores (para realizar un seguimiento de los desplazamientos de los temas).
* **watch** : Si es **true**, la entrada Kafka buscará periódicamente nuevos temas que coincidan con los patrones y comenzará a leer de ellos.
* **tls** : Opciones TLS/SSL como se describe en la [documentación de NodeJS](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options).
* **debug** : Booleano. Si es **true**, habilita el registro de depuración para la entrada Kafka.
* **options** : Objeto. Opciones adicionales de configuración de Kafka, como `sessionTimeout` y `requestTimeout`.

## Salida
Cada lectura generará un objeto con el siguiente esquema:
```javascript
{
	id : '<ID de entrada>',
	type : 'kafka',
	topic : '<nombre.del.tema>',
	originalMessage : '<valor en cadena o objeto JSON>'
}
```
