## HTTP/S Input

Fetch data from an http url, using GET method

## Examples

Fetch every 2 seconds, with basic authentication
```json
"inputs" : {
	"httpauth" : {
		"type" : "http",
		"config" : {
			"url" : "https://jigsaw.w3.org/HTTP/Basic/",
			"interval" : 2000,
			"options" : {
				"auth" : {
					"user" : "guest",
					"password" : "guest"
				}
			}
		}
	}
}
```

HTTPS JSON REST service
```json
"inputs" : {
	"httprest" : {
		"type" : "http",
		"config" : {
			"url" : "https://jsonplaceholder.typicode.com/todos/1",
			"interval" : 2000,
			"options" : {},
			"tls" : {
				"rejectUnauthorized" : false
			}
		}
	},
}
```

## Configuration parameters
* **url** : HTTP Fetch URL.
* **interval** : Number of milliseconds to fetch next data. Note that if not specified, this input behaves as a pull input (data will be fetched when the flow requires it), and, if set, then will behave as a push input (data will be fetched on an interval basis)
* **options** : Options passed to the HTTP Client, as described in [Request module](https://www.npmjs.com/package/request#requestoptions-callback)
* **tls** : TLS options as described in [NodeJS documentation](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options)

## Output
Each http call will generate an object with the following schema:
```javascript
{
	id : '<input ID>',
	type : 'http',
	url : '<URL>',
	statusCode : '<HTTP status code>',
	headers : '<Response Headers>',
	originalMessage : '<raw data>'
}
```
