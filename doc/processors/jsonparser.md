## JSON Parser

Parses a JSON expression.

## Examples
```json
"processors" : {
	"myjson" : {
		"type" : "json",
		"config" : {
			"output" : "jsondata",
			"input" : "${jsonline}"
		}
	}
}
```

## Configuration parameters
* **input** : Expression to be parsed
* **output** : Output field to store the JSON object
