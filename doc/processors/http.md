## HTTP Processor

The HTTP processor allows sending log entries to an HTTP endpoint. The result of the HTTP call is combined with the input object of the processor.

## Examples
```json
"processors": {
	"http": {
		"type": "http",
		"config": {
			"url": "http://example.com/logs",
			"method": "POST",
			"headers": {
				"Content-Type": "application/json"
			},
			"body": "${entry}"
		}
	}
}
```

## Configuration parameters
* **url**: The HTTP endpoint URL.
* **method**: HTTP method to use (e.g., GET, POST).
* **headers**: Object containing HTTP headers.
* **body**: Expression to generate the HTTP request body.
* **response handling**: The HTTP response is parsed and merged into the original log entry.
