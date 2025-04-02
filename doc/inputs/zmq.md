## ZeroMQ Input

The ZeroMQ Input creates a ZeroMQ client to consume messages from a publisher. It supports two modes: `pull` and `sub`. Messages can be processed in raw or JSON format.

## Examples

### Example 1: ZMQ in `sub` mode, subscribed to a specific channel
```json
"inputs": {
	"zmq": {
		"type": "zmq",
		"config": {
			"url": "tcp://127.0.0.1:9999",
			"mode": "sub",
			"channel": "my_channel",
			"format": "json"
		}
	}
}
```

### Example 2: ZMQ in `pull` mode
```json
"inputs": {
	"zmq": {
		"type": "zmq",
		"config": {
			"url": "tcp://127.0.0.1:8888",
			"mode": "pull",
			"format": "raw"
		}
	}
}
```

### Example 3: ZMQ in `sub` mode with wildcard channel subscription
```json
"inputs": {
	"zmq": {
		"type": "zmq",
		"config": {
			"url": "tcp://127.0.0.1:7777",
			"mode": "sub",
			"channel": "logs_*",
			"format": "json"
		}
	}
}
```

## Configuration Parameters

- **url**:  
  The connection URL for the ZeroMQ socket. Example: `tcp://127.0.0.1:9999`.

- **mode**:  
  The mode of operation.  
  - **pull**: Connects to a `PUSH` socket to receive messages.  
  - **sub**: Connects to a `PUB` socket and subscribes to a specific channel.

- **channel**:  
  The channel to subscribe to (only applicable in `sub` mode). Supports exact channel names or wildcard patterns.

- **format**:  
  Specifies the message format.  
  - **raw**: The raw content of the message is placed in the `originalMessage` field.  
  - **json**: The message content is parsed as a JSON object and placed in the `originalMessage` field.

## Output

Each message received from ZeroMQ generates an object with the following schema:
```javascript
{
	id: '<input ID>',
	type: 'zmq',
	mode: '<sub or pull>',
	url: '<Connection URL>',
	originalMessage: '<raw data or JSON object>',
	topic: '<channel name>' // Only present in `sub` mode
}
```

### Notes:
- If the `format` is set to **json**, the input will attempt to parse the message content as JSON. If parsing fails, a warning will be logged, and the raw message will be returned.
- The `topic` field is only present in `sub` mode and indicates the name of the channel from which the message was received.
- The `pull` mode does not use channels and processes all incoming messages.
