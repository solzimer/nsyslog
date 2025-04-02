## Entrada AMQP

La entrada AMQP permite consumir mensajes de un broker de mensajes compatible con AMQP (por ejemplo, RabbitMQ). Soporta formatos de mensajes en bruto y JSON.

## Ejemplos

### Consumir mensajes de una cola
```json
"inputs": {
	"amqp": {
		"type": "amqp",
		"config": {
			"url": "amqp://localhost",
			"queue": "test",
			"format": "json"
		}
	}
}
```

## Parámetros de configuración

- **url**: La URL del servidor AMQP. Por defecto es `amqp://localhost`.
- **queue**: El nombre de la cola desde la que se consumirán los mensajes. Por defecto es `test`.
- **format**: El formato del mensaje. Puede ser `raw` (por defecto) o `json`.

## Salida

Cada mensaje consumido genera un objeto con el siguiente esquema:
```javascript
{
	id: '<ID de entrada>',
	type: 'amqp',
	queue: '<nombre de la cola>',
	url: '<URL del servidor AMQP>',
	originalMessage: '<contenido del mensaje>'
}
```

### Notas:
- Si el `format` está configurado como `json`, la entrada intentará analizar el contenido del mensaje como JSON. Si el análisis falla, se registrará una advertencia y se devolverá el mensaje en bruto.
- Los mensajes se reconocen después de ser procesados con éxito.
