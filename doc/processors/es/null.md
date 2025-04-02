## Procesador Null

El Procesador Null no realiza ninguna operación en las entradas de registro. Simplemente pasa la entrada al resultado sin ninguna modificación.

## Ejemplos

### Ejemplo 1: Pasar sin cambios
#### Configuración
```json
"processors": {
	"nullProcessor": {
		"type": "null",
		"config": {}
	}
}
```

#### Entrada
```json
{
	"originalMessage": "Este es un mensaje de prueba",
	"level": "info"
}
```

#### Salida
```json
{
	"originalMessage": "Este es un mensaje de prueba",
	"level": "info"
}
```

---

## Parámetros de configuración

El `NullProcessor` no requiere ningún parámetro de configuración.
