## Split

Splits a expression by a delimiter token.

## Examples
Splits the original message into space separated words.
```json
"processors" : {
	"split" : {
		"type" : "split",
		"config" : {
			"input" : "${originalMessage}",
			"output" : "words",
			"separator" : " "
		}
	}
}
```

Splits the original message and map the elements into fields.
```json
"processors" : {
	"split" : {
		"type" : "split",
		"config" : {
			"input" : "${originalMessage}",
			"output" : "entry",
			"separator" : ";",
			"map" : [
				"header","host","port","_",
				"_","source","url"
			]
		}
	}
}
```

## Configuration parameters
* **input** : Input expression
* **output** : Output field
* **separator** : Separator token
* **map** : List of fields to be assigned.
