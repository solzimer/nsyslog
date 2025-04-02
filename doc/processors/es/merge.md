## Merge

Fusionar varios objetos en uno.

## Ejemplos
Fusionar dos campos de objeto en otro y eliminar los anteriores:
```json
"processors": {
	"merge": {
		"type": "merge",
		"config": {
			"fields": ["${map}", "${extra}"],
			"output": "entry",
			"delete": ["map", "extra"],
			"deep": true
		}
	}
}
```

### Entrada
```json
{
	"map": {
		"key1": "value1",
		"key2": "value2"
	},
	"extra": {
		"key3": "value3"
	}
}
```

### Salida
```json
{
	"entry": {
		"key1": "value1",
		"key2": "value2",
		"key3": "value3"
	}
}
```

## Parámetros de configuración
* **fields**: Array de expresiones de entrada a fusionar.
* **output**: Campo de salida para almacenar el objeto fusionado.
* **delete**: Lista de campos que se eliminarán de la entrada después de fusionar.
* **deep**: Booleano que indica si se debe realizar una fusión profunda (por defecto: `false`).
