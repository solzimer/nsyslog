## UDP Input

The UDP Input allows consuming messages over a UDP connection. It is lightweight and suitable for scenarios where low-latency message delivery is required.

## Examples

### Basic UDP Input Configuration
```json
"inputs": {
	"udp": {
		"type": "udp",
		"config": {
			"host": "0.0.0.0",
			"port": 514,
			"protocol": "udp4"
		}
	}
}
```

## Configuration Parameters

- **host**:  
  The host address to bind the UDP server to. Defaults to `0.0.0.0`.

- **port**:  
  The port number to listen on. Defaults to `514`.

- **protocol**:  
  The protocol to use for the UDP connection. Can be `udp4` or `udp6`. Defaults to `udp4`.

## Output

Each message received over the UDP connection generates an object with the following schema:
```javascript
{
	originalMessage: '<raw message>',
	server: {
		protocol: '<protocol>',
		port: <port>,
		interface: '<host>'
	},
	client: {
		address: '<client IP address>'
	}
}
```

### Notes:
- The `originalMessage` field contains the raw message received from the client.
- The `server` field provides details about the UDP server configuration.
- The `client` field contains the IP address of the client that sent the message.
- UDP is connectionless, so messages may arrive out of order or be lost in transit.
