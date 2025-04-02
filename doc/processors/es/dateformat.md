## Formateador de Fecha / Hora

Formatea una fecha. La fecha debe ser un objeto Date de JavaScript o un timestamp ISO (YYYY-MM-DDTHH:mm:ss).

## Ejemplos

```json
"processors" : {
	"format" : {
		"type" : "dateformat",
		"config" : {
			"input" : "${timestamp}",
			"format" : "DD/MM/YYYY",
			"output" : "date"
		}
	}
}
```

Asignaciones múltiples
```json
"processors" : {
	"format" : {
		"type" : "dateformat",
		"config" : {
			"input" : "${timestamp}",
			"fields" : [
				{"format" : "DD/MM/YYYY", "output" : "date"},
				{"format" : "HH:mm:ss", "output" : "time"}
			]
		}
	}
}
```

## Parámetros de configuración
* **field** / **input** : Expresión para el campo de timestamp.
* **format** : Formato de salida siguiendo el estándar de [MomentJS](https://momentjs.com/docs/#/displaying/format/).
* **output** : Campo de salida.
* **fields** : Array de valores <*format*,*output*> para asignaciones múltiples.
