## HTTP/S Server Input

The HTTP Server Input sets up a server to accept HTTP and HTTPS `PUT` and `POST` requests. Each request generates an input entry that is passed to the flows. Request messages can be either raw text or JSON-formatted.

## Examples

```json
{
	"inputs": {
		"http": {
			"type": "httpserver",
			"config": {
				"url": "http://0.0.0.0:8888",
				"format": "json"
			}
		},
		"https": {
			"type": "httpserver",
			"config": {
				"url": "https://0.0.0.0:8889",
				"format": "json",
				"tls": {
					"rejectUnauthorized": false,
					"cert": "/path/to/server.crt",
					"key": "/path/to/server.key"
				}
			}
		}
	}
}
```

## Configuration Parameters

- **url**: The server URL bind pattern. It follows the format `<protocol>://<bind host>:<bind port>`. Supported protocols are **http** and **https**.
- **tls**: An object passed to the TLS server socket, as described in the [Node.js documentation](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options).
- **format**: The message format. If specified, it must be set to **json**.

## Output

Each HTTP/S request generates an object with the following schema:

```javascript
{
	id: '<input ID>',
	type: 'httpserver',
	timestamp: Date.now(),
	originalMessage: '<http request body>',
	server: {
		protocol: '<bind protocol>',
		port: '<bind port>',
		host: '<bind host>'
	},
	client: {
		address: '<client address>',
		port: '<client port>'
	}
}
```

### Notes:
- The `originalMessage` field contains the body of the HTTP request.
- The `server` object provides details about the server's protocol, port, and host.
- The `client` object includes the client's IP address and port.
