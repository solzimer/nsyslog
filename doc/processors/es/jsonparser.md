## Analizador JSON

Analiza una expresión JSON en un objeto.

## Ejemplos
```json
"processors": {
	"myjson": {
		"type": "json",
		"config": {
			"output": "jsondata",
			"input": "${jsonline}"
		}
	}
}
```

#### Entrada y Salida (sin `unpack`)
**Cadena JSON de entrada:**
```json
{
	"key1": "value1",
	"key2.subkey": "value2"
}
```

**Salida:**
```json
{
	"jsondata": {
		"key1": "value1",
		"key2.subkey": "value2"
	}
}
```

### Ejemplo con `unpack`
```json
"processors": {
	"myjson": {
		"type": "json",
		"config": {
			"output": "jsondata",
			"input": "${jsonline}",
			"unpack": true
		}
	}
}
```

#### Entrada y Salida (con `unpack`)
**Cadena JSON de entrada:**
```json
{
	"key1": "value1",
	"key2.subkey": "value2"
}
```

**Salida:**
```json
{
	"jsondata": {
		"key1": "value1",
		"key2": {
			"subkey": "value2"
		}
	}
}
```

## Parámetros de configuración
* **input**: Expresión que contiene la cadena JSON a analizar (por defecto: `${originalMessage}`).
* **output**: Campo de salida para almacenar el objeto JSON analizado.
* **unpack**: Indicador booleano para descomponer claves separadas por puntos en el objeto JSON en objetos anidados (por defecto: `false`).
* **manejo de errores**: Si la entrada no es un JSON válido, se registrará un error y la entrada no será modificada.
