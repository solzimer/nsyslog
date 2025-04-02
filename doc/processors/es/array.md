## Array

Inserta entradas en un array de tamaño fijo y las emite cuando se alcanza el tamaño o en intervalos de tiempo.

## Ejemplos
Agrupación de arrays basada en tamaño. Emite una entrada con un campo 'array' que contiene
todos los elementos.
```json
"processors" : {
	"arrays" : {
		"type" : "array",
		"config" : {
			"max" : 10,
			"field" : "list"
		}
	}
}
```

Agrupación de arrays basada en tiempo y tamaño. Emite una entrada con un campo 'array' que contiene
todos los elementos, cuando el tamaño del array alcanza 10 entradas o en intervalos de 2 segundos.
```json
"processors" : {
	"arrays" : {
		"type" : "array",
		"config" : {
			"max" : 10,
			"timeout" : 2000,
			"field" : "list"
		}
	}
}
```

## Parámetros de configuración
* **max** : Número máximo de elementos en el array.
* **timeout** : Si se especifica, número de milisegundos del intervalo de emisión.
* **field** : Campo de salida.
