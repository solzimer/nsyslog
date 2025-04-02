## Procesador de Marca de Tiempo

El Procesador de Marca de Tiempo coloca una marca de tiempo en el objeto de entrada o analiza una expresión existente en un objeto `Date` de JavaScript o una marca de tiempo Unix.

## Ejemplos

### Ejemplo 1: Analizar una cadena de marca de tiempo
#### Configuración
```json
"processors": {
	"timestamp": {
		"type": "timestamp",
		"config": {
			"input": "${tsstring}",
			"format": "HH:mm:ss YYYY-MM-DD",
			"output": "timestamp"
		}
	}
}
```

#### Entrada
```json
{
	"tsstring": "12:33:48 2023-03-15"
}
```

#### Salida
```json
{
	"tsstring": "12:33:48 2023-03-15",
	"timestamp": "2023-03-15T12:33:48.000Z"
}
```

---

### Ejemplo 2: Usar la marca de tiempo actual
#### Configuración
```json
"processors": {
	"timestamp": {
		"type": "timestamp",
		"config": {
			"output": "currentTimestamp"
		}
	}
}
```

#### Entrada
```json
{
	"originalMessage": "Este es un mensaje de prueba"
}
```

#### Salida
```json
{
	"originalMessage": "Este es un mensaje de prueba",
	"currentTimestamp": "2023-03-15T10:00:00.000Z"
}
```

---

### Ejemplo 3: Salida como marca de tiempo Unix
#### Configuración
```json
"processors": {
	"timestamp": {
		"type": "timestamp",
		"config": {
			"input": "${tsstring}",
			"format": "YYYY-MM-DD HH:mm:ss",
			"output": "unixTimestamp",
			"unix": true
		}
	}
}
```

#### Entrada
```json
{
	"tsstring": "2023-03-15 12:33:48"
}
```

#### Salida
```json
{
	"tsstring": "2023-03-15 12:33:48",
	"unixTimestamp": 1678884828000
}
```

---

## Parámetros de Configuración
* **input**: Opcional. Si se especifica, la expresión para obtener una cadena de marca de tiempo a analizar. Si no se especifica, el procesador usará la marca de tiempo actual.
* **format**: Si se especifica **input**, la expresión de formato de la entrada a analizar, siguiendo el formato de [MomentJS](https://momentjs.com/docs/#/displaying/format/).
* **output**: El campo donde se almacenará la marca de tiempo.
* **unix**: Si es `true`, la marca de tiempo se almacenará como una marca de tiempo Unix (milisegundos desde la época) en lugar de un objeto `Date` de JavaScript.
