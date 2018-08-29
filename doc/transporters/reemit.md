```json
"transporters" : {
	"stat" : {
		"type" : "stat",
		"config" : {
			"threshold" : 1000
		}
	},
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
	},
	"log" : {
		"type" : "console",
		"config" : {"format" : "${match} => ${originalMessage}", "level" : "log"}
	},
	"file" : {
		"type" : "file",
		"config" : {
			"path" : "/var/logout${path}"
		}
	},
	"syslog" : {
		"type" : "syslog",
		"config" : {
			"url" : "tcp://192.168.134.90:514",
			"format" : "${originalMessage}",
			"application" : "${filename}",
			"hostname" : "localhost",
			"level" : "info",
			"facility" : 5,
			"stream" : true
		}
	},
	"null" : {
		"type" : "null"
	}
}
```
