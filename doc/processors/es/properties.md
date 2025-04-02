## Procesador de Propiedades

Establece nuevas propiedades en el objeto de entrada. El objeto puede extenderse con estas nuevas propiedades o ser reemplazado por ellas.

## Ejemplos

### Ejemplo 1: Reemplazar el objeto de entrada
#### Configuración
```json
"processors": {
	"totuple": {
		"type": "properties",
		"config": {
			"extend": false,
			"set": {
				"tuple": ["${originalMessage}", "${timestamp}"],
				"length": "${originalMessage.length}",
				"extra": {
					"type": "syslog",
					"format": "BSD"
				}
			}
		}
	}
}
```

#### Entrada
```json
{
	"originalMessage": "Este es un mensaje de prueba",
	"timestamp": "2023-03-15T10:00:00Z"
}
```

#### Salida
```json
{
	"tuple": ["Este es un mensaje de prueba", "2023-03-15T10:00:00Z"],
	"length": 21,
	"extra": {
		"type": "syslog",
		"format": "BSD"
	}
}
```

---

### Ejemplo 2: Extender el objeto de entrada con fusión profunda
#### Configuración
```json
"processors": {
	"fromtuple": {
		"type": "properties",
		"config": {
			"deep": true,
			"extend": true,
			"set": {
				"count": "${tuple[0]}",
				"tokens": "${tuple[1]}"
			}
		}
	}
}
```

#### Entrada
```json
{
	"tuple": [5, ["token1", "token2"]],
	"metadata": {
		"source": "logfile"
	}
}
```

#### Salida
```json
{
	"tuple": [5, ["token1", "token2"]],
	"metadata": {
		"source": "logfile"
	},
	"count": 5,
	"tokens": ["token1", "token2"]
}
```

---

## Parámetros de Configuración
* **set**: Objeto que contiene las nuevas propiedades a establecer. Estas propiedades pueden ser expresiones evaluadas dinámicamente.
* **extend**: (Por defecto: `true`) Cuando está habilitado, el objeto de entrada se extenderá con las propiedades generadas. Si está deshabilitado, el objeto de entrada será reemplazado por un nuevo objeto que contiene solo las propiedades generadas.
* **deep**: (Por defecto: `false`) Cuando está habilitado y **extend** es `true`, las propiedades generadas se fusionarán profundamente en el objeto de entrada si su destino ya existe. De lo contrario, el campo de destino será reemplazado.
* **delete**: (Opcional) Lista de campos a eliminar del objeto de entrada.
