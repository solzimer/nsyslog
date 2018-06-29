```json
"transporters" : {
	"mongo" : {
		"type" : "mongo",
		"config" : {
			"url" : "mongodb://localhost:27017/test",
			"collection" : "syslog",
			"format" : {
				"path" : "${path}",
				"message" : "${originalMessage}",
				"timestamp": "${timestamp}",
				"extra" : {
					"type" : "${type}",
					"path" : "${path}"
				}
			}
		}
	}
}
```
