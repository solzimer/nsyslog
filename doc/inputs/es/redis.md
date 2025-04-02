## Entrada Redis

La entrada Redis permite consumir mensajes de canales pub/sub de Redis. Admite la suscripción a múltiples canales o patrones de canales y puede procesar mensajes en formato sin procesar o JSON.

## Ejemplos

### Suscribirse a múltiples canales de Redis
```json
"inputs": {
	"redis": {
		"type": "redis",
		"config": {
			"url": "redis://localhost",
			"channels": ["test*", "input", "logs_*"],
			"format": "raw"
		}
	}
}
```

### Suscribirse a un solo canal con análisis de mensajes JSON
```json
"inputs": {
	"redis": {
		"type": "redis",
		"config": {
			"url": "redis://localhost",
			"channels": "events",
			"format": "json"
		}
	}
}
```

## Parámetros de configuración

- **url**:  
  Una cadena o un array de cadenas que especifica el host de Redis al que conectarse.  
  - Si Redis admite clustering, se utilizará el modo clúster y se descubrirán automáticamente los hosts.  
  - Si el clustering no está habilitado, se utilizará la primera URL para la conexión.  
  Valor por defecto: `redis://localhost:6379`.

- **channels**:  
  Una cadena o un array de cadenas que especifica los canales de Redis a los que suscribirse.  
  - Admite patrones de canales de Redis (por ejemplo, `test*`, `logs_*`).  

- **format**:  
  Especifica el formato del mensaje.  
  - **raw**: El contenido sin procesar del mensaje se coloca en el campo `originalMessage`.  
  - **json**: El contenido del mensaje se analiza como un objeto JSON y se coloca en `originalMessage`.  
  Valor por defecto: **raw**.

## Salida

Cada mensaje recibido desde Redis genera un objeto con el siguiente esquema:
```javascript
{
	id: '<input ID>',
	type: 'redis',
	channel: '<nombre del canal>',
	originalMessage: '<Valor en cadena o objeto JSON>'
}
```

### Notas:
- Si el `format` está configurado como **json**, la entrada intentará analizar el contenido del mensaje como JSON. Si el análisis falla, se registrará una advertencia y se devolverá el mensaje sin procesar.
- El campo `channel` indica el nombre del canal desde el cual se recibió el mensaje.
- Esta entrada admite tanto Redis de nodo único como clústeres de Redis.

