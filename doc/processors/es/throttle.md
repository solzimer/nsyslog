## Procesador de Limitación (Throttle)

El Procesador de Limitación controla la velocidad a la que se procesan las entradas de registro. Almacena en búfer las entradas de registro y las procesa a intervalos fijos.

## Ejemplos

### Ejemplo 1: Limitar las entradas de registro con un intervalo de 1 segundo
#### Configuración
```json
"processors": {
	"throttle": {
		"type": "throttle",
		"config": {
			"timeout": 1000
		}
	}
}
```

#### Entrada
```json
[
	{ "originalMessage": "Mensaje 1" },
	{ "originalMessage": "Mensaje 2" },
	{ "originalMessage": "Mensaje 3" }
]
```

#### Salida (procesado una entrada por segundo)
```json
{ "originalMessage": "Mensaje 1" }
```
```json
{ "originalMessage": "Mensaje 2" }
```
```json
{ "originalMessage": "Mensaje 3" }
```

---

### Ejemplo 2: Sin limitación
#### Configuración
```json
"processors": {
	"throttle": {
		"type": "throttle",
		"config": {
			"timeout": 0
		}
	}
}
```

#### Entrada
```json
[
	{ "originalMessage": "Mensaje 1" },
	{ "originalMessage": "Mensaje 2" },
	{ "originalMessage": "Mensaje 3" }
]
```

#### Salida (procesado inmediatamente)
```json
{ "originalMessage": "Mensaje 1" }
```
```json
{ "originalMessage": "Mensaje 2" }
```
```json
{ "originalMessage": "Mensaje 3" }
```

---

## Parámetros de Configuración
* **timeout**: El intervalo en milisegundos para procesar las entradas almacenadas en el búfer. Si se establece en `0`, la limitación está deshabilitada y las entradas se procesan inmediatamente.
