## WebSocket Input

Creates a WebSocket server and reads raw or json data from clients.

## Examples

TLS WebSockets server on port 3000
```json
"inputs" : {
	"ws" : {
		"type" : "ws",
		"config" : {
			"url" : "wss://127.0.0.1:3000",
			"format" : "json",
			"tls" : {
				"key" : "server.key",
				"cert" : "server.crt"
			}
		}
	}
}
```

## Configuration parameters
* **url** : Binding URL.
* **format** : can be *raw* or *json*. If *json* format is used, each received message is interpreted as a single JSON object.
* **tls** : TLS options as described in [NodeJS documentation](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options)

## Output
Each read will generate an object with the following schema:
```javascript
{
	id : '<input ID>',
	type : 'ws',
	originalMessage : '<raw data or JSON object>'
}
```
