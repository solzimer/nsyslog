## Procesador de Traducción

El Procesador de Traducción traduce valores de campos utilizando una tabla de búsqueda. Soporta mapeos en línea, archivos JSON externos y expresiones dinámicas.

## Ejemplos

### Ejemplo 1: Traducir códigos de estado HTTP
#### Configuración
```json
"processors": {
	"trans": {
		"type": "translate",
		"config": {
			"file": "./data/http_codes.json",
			"map": {
				"200": "OK",
				"304": "Redirección",
				"500": "Error Interno del Servidor",
				"*": "Código Desconocido"
			},
			"fields": [
				{ "input": "${http.status}", "output": "http.statusString" }
			]
		}
	}
}
```

#### Entrada
```json
{
	"http": {
		"status": "200"
	}
}
```

#### Salida
```json
{
	"http": {
		"status": "200",
		"statusString": "OK"
	}
}
```

---

### Ejemplo 2: Traducción por defecto para valores desconocidos
#### Configuración
```json
"processors": {
	"trans": {
		"type": "translate",
		"config": {
			"map": {
				"200": "OK",
				"*": "Código Desconocido"
			},
			"fields": [
				{ "input": "${http.status}", "output": "http.statusString" }
			]
		}
	}
}
```

#### Entrada
```json
{
	"http": {
		"status": "404"
	}
}
```

#### Salida
```json
{
	"http": {
		"status": "404",
		"statusString": "Código Desconocido"
	}
}
```

---

## Parámetros de Configuración
* **file**: Ruta a un archivo JSON que contiene pares clave/valor para la traducción.
* **map**: Mapa en línea de pares clave/valor para la traducción. Soporta expresiones dinámicas.
* **fields**: Array de mapeos de campos con las siguientes propiedades:
  - **input**: Expresión para extraer el valor de entrada.
  - **output**: Campo donde se almacenará el valor traducido.
