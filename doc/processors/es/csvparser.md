## Analizador CSV

Analiza una expresión en un array de campos CSV.

## Ejemplos
Analizador CSV con 3 núcleos (si se admite multithreading)
```json
"processors" : {
	"csv" : {
		"type" : "csvout",
		"config" : {
			"output" : "csvdata",
			"input" : "${csvline}",
			"cores" : 3,
			"options" : {
				"delimiter" : ","
			}
		}
	}
}
```

## Parámetros de configuración
* **output** : Campo de salida para almacenar el array CSV.
* **input** : Expresión a analizar.
* **cores** : Número de hilos si el multithreading es compatible con Node.js.
* **options** : Objeto de opciones para pasar al [analizador CSV](https://csv.js.org/parse/options/).
