## HTTP/S Server Input

HTTP Server Input places a server that accept HTTP and HTTPS PUT and POST requests. Each request generates an input entry that is passed to the flows. Request messages can be either raw text or json formatted.

## Examples

```json
{
	"inputs" : {
		"http" : {
			"type" : "httpserver",
			"config" : {
				"url" : "http://0.0.0.0:8888",
				"format" : "json"
			}
		},
		"https" : {
			"type" : "httpserver",
			"config" : {
				"url" : "https://0.0.0.0:8889",
				"format" : "json",
				"tls" : {
					"rejectUnauthorized" : false,
					"cert" : "/path/to/server.crt",
					"key" : "/path/to/server.key"
				}
			}
		}
	}
}
```

## Configuration parameters
* **url** : Server URL bind pattern. Takes the form of *&lt;protocol&gt;://&lt;bind host&gt;:&lt;bind port&gt;*. Allowed protocols are: **http** and **https**.
* **tls** : Object passed to the TLS server socket, as described in [NodeJS documentation](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options)
* **format** : Message format. If present, can only have the **json** value.

## Output
Each http/s request will generate an object with the following schema:
```javascript
{
	id : '<input ID>',
	type : 'httpserver',
	timestamp : Date.now(),
	originalMessage : '<http request body>',
	server : {
		{
			protocol : '<bind protocol>',
			port : '<bind port>',
			host : '<bind host>'
		}
	},
	client : {
		address : '<client address>',
		port : '<client port>'
	}
}
```
