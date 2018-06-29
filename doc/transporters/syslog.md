```json
"transporters" : {
	"syslog" : {
		"type" : "syslog",
		"config" : {
			"url" : "udp://192.168.134.90:514",
			"format" : "${originalMessage}",
			"application" : "${filename}",
			"hostname" : "localhost",
			"level" : "info",
			"facility" : 5,
			"stream" : false
		}
	}
}
```
