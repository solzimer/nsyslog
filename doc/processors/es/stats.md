## Procesador de Estadísticas

El Procesador de Estadísticas rastrea y registra estadísticas sobre flujos en las entradas de registro. Cuenta las ocurrencias de cada flujo y registra periódicamente las estadísticas.

## Ejemplos

### Ejemplo 1: Registrar estadísticas de flujo en el nivel "info"
#### Configuración
```json
"processors": {
	"statsProcessor": {
		"type": "stats",
		"config": {
			"level": "info"
		}
	}
}
```

#### Entrada
```json
{
	"flows": ["flujo1", "flujo2", "flujo1", "flujo3"]
}
```

#### Salida
```json
{
	"flows": ["flujo1", "flujo2", "flujo1", "flujo3"]
}
```

#### Salida Registrada (después de 10 segundos)
```
Flujo flujo1 => 2
Flujo flujo2 => 1
Flujo flujo3 => 1
```

---

## Parámetros de Configuración
* **level**: El nivel de registro a utilizar para informar estadísticas (por defecto: `"info"`). Los niveles soportados incluyen `"info"`, `"warn"`, `"error"`, etc.
* **interval**: El procesador registra estadísticas cada 10 segundos por defecto. Este intervalo no es configurable en la implementación actual.
