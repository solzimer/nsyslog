## Analizador Key/Value

Analiza una expresión en formato clave=valor y genera un mapa.

Ejemplo de entrada:
```
field1=value1 field2="valor con espacios" field3=value3 ...
```

## Ejemplos
```json
"processors": {
	"parser": {
		"type": "keyvalparser",
		"config": {
			"input": "${originalMessage}",
			"output": "keyvals"
		}
	}
}
```

Salida:
```json
{
	"originalMessage": "field1=value1 field2=\"valor con espacios\" field3=value3",
	"keyvals": {
		"field1": "value1",
		"field2": "valor con espacios",
		"field3": "value3"
	}
}
```

## Parámetros de configuración
* **input**: Expresión a analizar (por defecto: `${originalMessage}`).
* **output**: Campo de salida para almacenar el objeto JSON analizado.
* **behavior**: Maneja valores entrecomillados y espacios dentro de las comillas.
