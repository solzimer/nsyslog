```json
"transporters" : {
	"syslog" : {
		"type" : "syslog",
		"config" : {
			"url" : "tls://192.168.134.90:514",
			"format" : "${originalMessage}",
			"application" : "${filename}",
			"hostname" : "localhost",
			"level" : "info",
			"facility" : 5,
			"stream" : false,
			"tls" : {
				"key" : "./config/server.key",
				"cert" : "./config/server.crt"
			}			
		}
	}
}
```
