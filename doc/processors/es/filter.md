## Filtro

El procesador `filter` se utiliza para filtrar y agregar entradas de registro basándose en una clave y una expresión de coincidencia. Proporciona las siguientes funcionalidades:

1. **Aceptar o rechazar entradas** basándose en una expresión de filtro.
2. **Agregar múltiples entradas** basándose en una clave, generando solo el resultado agregado.

## Ejemplos

### Ejemplo 1: Aceptar entradas basándose en un filtro
Permitir solo entradas donde `event_type` sea igual a `flow`:
```json
"processors": {
	"filter_flow": {
		"type": "filter",
		"config": {
			"mode": "accept",
			"filter": "${event_type}=='flow'"
		}
	}
}
```

### Ejemplo 2: Agregar entradas por una clave
Agregar entradas por el campo `src_ip`. Generar salida solo cuando se hayan agregado 100 entradas que coincidan con la misma clave:
```json
"processors": {
	"aggregate": {
		"type": "filter",
		"config": {
			"mode": "every",
			"every": 100,
			"key": "${src_ip}",
			"output": "count"
		}
	}
}
```

### Ejemplo 3: Agregar con un tiempo de espera
Agregar entradas por el campo `src_ip`. Generar salida cuando se hayan agregado 100 entradas que coincidan con la misma clave, o después de un tiempo de espera de 5 minutos (300,000 ms):
```json
"processors": {
	"aggregate": {
		"type": "filter",
		"config": {
			"mode": "every",
			"every": 100,
			"ttl": 300000,
			"key": "${src_ip}",
			"output": "count"
		}
	}
}
```

### Ejemplo 4: Agregación con estadísticas
Agregar entradas por el campo `src_ip`. Generar salida cuando se hayan agregado 100 entradas que coincidan con la misma clave, incluyendo estadísticas como recuento de paquetes y bytes:
```json
"processors": {
	"aggregate": {
		"type": "filter",
		"config": {
			"mode": "every",
			"every": 100,
			"key": "${src_ip}",
			"output": "aggr",
			"aggregate": {
				"count": 1,
				"tx_packet": "${flow.pkts_toserver}",
				"rx_packet": "${flow.pkts_toclient}",
				"tx_bytes": "${flow.bytes_toserver}",
				"rx_bytes": "${flow.bytes_toclient}"
			}
		}
	}
}
```

## Parámetros de configuración

### **mode**
Especifica el modo de procesamiento. Valores posibles:
- **accept**: La entrada se acepta como salida si coincide con el filtro.
- **reject**: La entrada se acepta como salida si no coincide con el filtro.
- **every**: Las entradas que coinciden con el filtro se agregan por una clave.

### **filter**
Una expresión JavaScript para evaluar si una entrada coincide con el filtro.  
Por defecto: `"true"`.

### **key**
Una expresión para determinar la clave de agregación. Esto se utiliza para agrupar entradas para la agregación.

### **every**
Especifica cuántas entradas agregar antes de generar la siguiente salida.  
Por defecto: `1`.

### **ttl**
Especifica una ventana de tiempo de espera (en milisegundos) para la agregación. Cuando se alcanza el tiempo de espera, los resultados agregados para una clave se generan incluso si no se ha cumplido la condición `every`.  
Por defecto: `0` (sin tiempo de espera).

### **first**
Determina si la primera entrada en un grupo se genera inmediatamente.  
- **true**: La primera entrada se envía inmediatamente, y las entradas posteriores se agregan.  
- **false**: El procesador espera hasta que se cumpla la condición `every` antes de generar la salida.  
Por defecto: `true`.

### **output**
El campo donde se almacenan los resultados de la agregación.

### **aggregate**
Un objeto que describe las agregaciones a realizar. Cada clave en el objeto representa un campo en la salida, y su valor es una expresión para calcular el valor agregado.  
Ejemplo:
```json
"aggregate": {
	"count": 1,
	"tx_packet": "${flow.pkts_toserver}",
	"rx_packet": "${flow.pkts_toclient}"
}
```

## Notas
- El procesador `filter` es altamente flexible y puede usarse tanto para filtrado simple como para escenarios de agregación complejos.
- Al usar el modo `every` con un `ttl`, asegúrese de que el valor del tiempo de espera sea apropiado para su caso de uso para evitar salidas prematuras o retrasadas.
