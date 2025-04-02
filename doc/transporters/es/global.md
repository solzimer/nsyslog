## Transportador Global

El Transportador Global almacena mensajes de registro en una memoria compartida global. Permite el acceso centralizado a los datos de registro en diferentes partes de la aplicación.

## Ejemplos

```json
"transporters" : {
	"global" : {
		"type" : "global",
		"config" : {
			"input" : "${originalMessage}",
			"output" : "nsyslog"
		}
	}
}
```

## Parámetros de configuración
* **input** : Expresión de entrada para el mensaje de registro. Por defecto es `${originalMessage}`.
* **output** : La clave en la memoria compartida global donde se almacenará el mensaje. Por defecto es `nsyslog`.
