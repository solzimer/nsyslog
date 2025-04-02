## CSV Out

Emite los campos de entrada como una cadena CSV plana.

## Ejemplos
Línea CSV con delimitador 'coma'
```json
"processors" : {
	"csv" : {
		"type" : "csvout",
		"config" : {
			"output" : "csvline",
			"fields" : ["${originalMessage}","${type}","${input}","${timestamp}"],
			"options" : {
				"delimiter" : ","
			}
		}
	}
}
```

## Parámetros de configuración
* **output** : Campo de salida para almacenar la línea CSV.
* **fields** : Array de expresiones para obtener los campos del CSV.
* **options** : Objeto de opciones para pasar al [procesador CSV](https://csv.js.org/stringify/options/).
