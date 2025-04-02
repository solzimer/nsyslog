## Transportador Stat

Registra el número de mensajes recibidos después de un umbral especificado.

## Ejemplos

```json
"transporters" : {
	"stat" : {
		"type" : "stat",
		"config" : {
			"threshold" : 1000
		}
	}
}
```

## Parámetros de configuración
* **threshold** : El umbral de conteo de mensajes para registrar. Por defecto es 1000.
