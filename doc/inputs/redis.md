## Redis Input

The Redis Input allows consuming messages from Redis pub/sub channels. It supports subscribing to multiple channels or channel patterns and can process messages in raw or JSON format.

## Examples

### Subscribe to multiple Redis channels
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

### Subscribe to a single channel with JSON message parsing
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

## Configuration Parameters

- **url**:  
  A string or an array of strings specifying the Redis host(s) to connect to.  
  - If Redis supports clustering, it will use cluster mode and autodiscover hosts.  
  - If clustering is not supported, the first URL will be used for the connection.  
  Defaults to `redis://localhost:6379`.

- **channels**:  
  A string or an array of strings specifying the Redis channels to subscribe to.  
  - Supports Redis channel patterns (e.g., `test*`, `logs_*`).  

- **format**:  
  Specifies the message format.  
  - **raw**: The raw content of the message is placed in the `originalMessage` field.  
  - **json**: The message content is parsed as a JSON object and placed in the `originalMessage` field.  
  Defaults to **raw**.

## Output

Each message received from Redis generates an object with the following schema:
```javascript
{
	id: '<input ID>',
	type: 'redis',
	channel: '<channel name>',
	originalMessage: '<String value or JSON object>'
}
```

### Notes:
- If the `format` is set to **json**, the input will attempt to parse the message content as JSON. If parsing fails, a warning will be logged, and the raw message will be returned.
- The `channel` field indicates the name of the channel from which the message was received.
- This input supports both single-node Redis and Redis clusters.
