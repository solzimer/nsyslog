## WebSocket Input

The WebSocket Input creates a WebSocket server to receive messages from clients. It supports both plain and secure WebSocket (TLS) connections. Messages can be processed in raw or JSON format.

## Examples

### Example 1: Plain WebSocket server on port 8080
```json
"inputs": {
	"ws": {
		"type": "ws",
		"config": {
			"url": "ws://127.0.0.1:8080",
			"format": "raw"
		}
	}
}
```

### Example 2: Secure WebSocket server with TLS
```json
"inputs": {
	"ws": {
		"type": "ws",
		"config": {
			"url": "wss://127.0.0.1:3000",
			"format": "json",
			"tls": {
				"key": "server.key",
				"cert": "server.crt"
			}
		}
	}
}
```

### Example 3: WebSocket server with custom TLS options
```json
"inputs": {
	"ws": {
		"type": "ws",
		"config": {
			"url": "wss://0.0.0.0:8443",
			"format": "json",
			"tls": {
				"key": "custom.key",
				"cert": "custom.crt",
				"ca": ["ca1.crt", "ca2.crt"]
			}
		}
	}
}
```

## Configuration Parameters

- **url**:  
  The binding URL for the WebSocket server. Example: `ws://127.0.0.1:8080` or `wss://127.0.0.1:3000`.

- **format**:  
  Specifies the message format.  
  - **raw**: The raw content of the message is placed in the `originalMessage` field.  
  - **json**: The message content is parsed as a JSON object and placed in the `originalMessage` field.

- **tls**:  
  TLS options for secure WebSocket connections.  
  - **key**: Path to the private key file.  
  - **cert**: Path to the certificate file.  
  - **ca**: Array of paths to certificate authority files (optional).  
  See the [Node.js TLS documentation](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options) for more details.

## Output

Each message received from a WebSocket client generates an object with the following schema:
```javascript
{
	id: '<input ID>',
	type: 'ws',
	originalMessage: '<raw data or JSON object>'
}
```

### Notes:
- If the `format` is set to **json**, the input will attempt to parse the message content as JSON. If parsing fails, a warning will be logged, and the raw message will be returned.
- The WebSocket server supports multiple concurrent client connections.
- Secure WebSocket (wss) requires valid TLS certificates to establish encrypted connections.
