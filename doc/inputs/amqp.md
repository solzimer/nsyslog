## AMQP Input

The AMQP Input allows consuming messages from an AMQP-compatible message broker (e.g., RabbitMQ). It supports raw and JSON message formats.

## Examples

### Consume messages from a queue
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

## Configuration Parameters

- **url**: The AMQP server URL. Defaults to `amqp://localhost`.
- **queue**: The name of the queue to consume messages from. Defaults to `test`.
- **format**: The message format. Can be `raw` (default) or `json`.

## Output

Each consumed message generates an object with the following schema:
```javascript
{
	id: '<input ID>',
	type: 'amqp',
	queue: '<queue name>',
	url: '<AMQP server URL>',
	originalMessage: '<message content>'
}
```

### Notes:
- If the `format` is set to `json`, the input will attempt to parse the message content as JSON. If parsing fails, a warning will be logged, and the raw message will be returned.
- Messages are acknowledged after being successfully processed.
