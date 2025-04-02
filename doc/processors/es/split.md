## Procesador de División (Split)

Divide una expresión utilizando un delimitador.

## Ejemplos

### Ejemplo 1: Dividir en un array
#### Configuración
```json
"processors": {
	"split": {
		"type": "split",
		"config": {
			"input": "${originalMessage}",
			"output": "words",
			"separator": " "
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
	"words": ["Este", "es", "un", "mensaje", "de", "prueba"]
}
```

---

### Ejemplo 2: Mapear elementos divididos a campos
#### Configuración
```json
"processors": {
	"split": {
		"type": "split",
		"config": {
			"input": "${originalMessage}",
			"output": "entry",
			"separator": ";",
			"map": ["header", "host", "port", "source", "url"]
		}
	}
}
```

#### Entrada
```json
{
	"originalMessage": "HTTP;localhost;8080;app;http://example.com"
}
```

#### Salida
```json
{
	"originalMessage": "HTTP;localhost;8080;app;http://example.com",
	"entry": {
		"header": "HTTP",
		"host": "localhost",
		"port": "8080",
		"source": "app",
		"url": "http://example.com"
	}
}
```

---

### Ejemplo 3: Procesar cada elemento dividido individualmente
#### Configuración
```json
"processors": {
	"split": {
		"type": "split",
		"config": {
			"input": "${originalMessage}",
			"output": "item",
			"separator": ",",
			"mode": "item"
		}
	}
}
```

#### Entrada
```json
{
	"originalMessage": "item1,item2,item3"
}
```

#### Salida (procesado individualmente)
```json
{
	"originalMessage": "item1,item2,item3",
	"item": "item1"
}
```
```json
{
	"originalMessage": "item1,item2,item3",
	"item": "item2"
}
```
```json
{
	"originalMessage": "item1,item2,item3",
	"item": "item3"
}
```

---

## Parámetros de Configuración
* **input**: Expresión de entrada para extraer el valor a dividir (por defecto: `${originalMessage}`).
* **output**: Campo de salida para almacenar el resultado.
* **separator**: Delimitador utilizado para dividir la entrada (por defecto: `" "`).
* **map**: Lista de campos para asignar elementos divididos (utilizado en el modo "map").
* **mode**: Modo de división:
  - `"array"`: Devuelve un array de elementos divididos (por defecto).
  - `"item"`: Procesa cada elemento dividido como una entrada separada.
  - `"map"`: Mapea elementos divididos a campos especificados.
