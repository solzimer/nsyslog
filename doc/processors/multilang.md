```json
"processors" : {
	"tokenize" : {
		"type" : "multilang",
		"config" : {
			"path" : "node multilang/js/tokenize.js",
			"cores" : 4,
			"wire" : "shuffle",
			"module" : false,
			"input" : "${tuple}",
			"output" : "tuple",
			"options" : {
				"max" : 10
			}
		}
	}
}
```
