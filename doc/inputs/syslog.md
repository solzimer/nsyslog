```json
"inputs" : {
	"syslog" : {
		"type" : "syslog",
		"maxPending" : 1000,
		"buffer" : true,
		"config" : {
			"url" : "tls://0.0.0.0:514",
			"tls" : {
				"key" : "./config/server.key",
				"cert" : "./config/server.crt"
			}
		}
	}
}
```
