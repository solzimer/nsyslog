```json
"processors" : {
	"totuple" : {
		"type" : "properties",
		"config" : {
			"set" : {
				"tuple" : ["${originalMessage}", "${timestamp}"]
			}
		}
	},
	"fromtuple" : {
		"type" : "properties",
		"config" : {
			"set" : {
				"count" : "${tuple[0]}",
				"tokens" : "${tuple[1]}"
			}
		}
	}
}
```
