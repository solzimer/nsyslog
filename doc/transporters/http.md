## HTTP/S Transporter

Sends data through HTTP/S post or put method.

## Examples

```json
"transporters" : {
	"http" : {
		"type" : "http",
		"config" : {
			"url" : "http://foo.bar/logs/put",
			"method" : "put",
			"format" : "${originalMessage}",
			"headers" : {
				"Content-Type" : "application/json"
			}
		}
	}
}
```

## Configuration parameters
* **url** : HTTP/S URL Endpoint (proto://host:port/path), where *proto* can be either http or https.
* **format** : Output expression of the message being sent
* **method** : *post* or *put*
* **headers** : Additional headers to be sent on each http request
* **tls** : TLS options as described in [NodeJS documentation](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options)
