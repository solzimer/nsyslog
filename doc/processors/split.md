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

## Configuration parameters
* **input** : Input expression
* **output** : Output field
* **separator** : Separator token
