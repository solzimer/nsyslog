## Key/Value Parser

Parses a expression that has a key=value format and generates a map.

```
field1=value1 field2="value with spaces" field3=value3 ....
```

## Examples
```json
"processors" : {
	"parser": {
		"type": "keyvalparser",
		"config": {
			"input" : "${originalMessage}",
			"output" : "keyvals"
		}
	}
}
```

Output :
```json
{
	"originalMessage" : "field1=value1 field2=\"value with spaces\" field3=value3",
	"keyvals" : {
		"field1" : "value1",
		"field2" : "value with spaces",
		"field3" : "value3"
	}
}
```

## Configuration parameters
* **input** : Expression to be parsed
* **output** : Output field to store the JSON object
