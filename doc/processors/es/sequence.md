## Procesador de Secuencia

Añade un número de secuencia incremental al objeto de entrada.

## Ejemplos

### Ejemplo 1: Iniciar la secuencia desde 0
#### Configuración
```json
"processors": {
	"seq": {
		"type": "sequence",
		"config": {
			"start": 0
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
	"seq": 0
}
```

---

### Ejemplo 2: Iniciar la secuencia desde 100
#### Configuración
```json
"processors": {
	"seq": {
		"type": "sequence",
		"config": {
			"start": 100
		}
	}
}
```

#### Entrada
```json
{
	"originalMessage": "Otro mensaje de prueba"
}
```

#### Salida
```json
{
	"originalMessage": "Otro mensaje de prueba",
	"seq": 100
}
```

---

## Parámetros de Configuración
* **start**: El valor inicial para la secuencia (por defecto: `0`).
