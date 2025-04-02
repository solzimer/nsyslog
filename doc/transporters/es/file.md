## Transportador de Archivos

Envía datos a un archivo.

## Ejemplos

```json
"transporters" : {
	"file" : {
		"type" : "file",
		"config" : {
			"path" : "/var/logout${path}",
			"format" : "${originalMessage}"
		}
	}
}
```

## Parámetros de configuración
* **path** : Ruta del archivo (admite expresiones).
* **format** : Expresión de salida del mensaje que se envía.
