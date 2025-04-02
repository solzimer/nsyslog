## TCP Input

The TCP Input allows consuming messages over a TCP connection. It supports handling multiple client connections and processes messages in real-time.

## Examples

### Basic TCP Input Configuration
```json
"inputs": {
	"tcp": {
		"type": "tcp",
		"config": {
			"host": "0.0.0.0",
			"port": 514,
			"protocol": "tcp4"
		}
	}
}
```

## Configuration Parameters

- **host**:  
  The host address to bind the TCP server to. Defaults to `0.0.0.0`.

- **port**:  
  The port number to listen on. Defaults to `514`.

- **protocol**:  
  The protocol to use for the TCP connection. Can be `tcp4` or `tcp6`. Defaults to `tcp4`.

## Output

Each message received over the TCP connection generates an object with the following schema:
```javascript
{
	originalMessage: '<raw message>',
	server: {
		protocol: '<protocol>',
		port: <port>,
		host: '<host>'
	},
	client: {
		address: '<client IP address>'
	}
}
```

### Notes:
- The `originalMessage` field contains the raw message received from the client.
- The `server` field provides details about the TCP server configuration.
- The `client` field contains the IP address of the client that sent the message.
- The input supports handling multiple client connections simultaneously.
