## Key/Value Parser

Parses an expression in the key=value format and generates a map.

Example input:
```
field1=value1 field2="value with spaces" field3=value3 ...
```

## Examples
```json
"processors": {
	"parser": {
		"type": "keyvalparser",
		"config": {
			"input": "${originalMessage}",
			"output": "keyvals"
		}
	}
}
```

Output:
```json
{
	"originalMessage": "field1=value1 field2=\"value with spaces\" field3=value3",
	"keyvals": {
		"field1": "value1",
		"field2": "value with spaces",
		"field3": "value3"
	}
}
```

## Configuration parameters
* **input**: Expression to be parsed (default: `${originalMessage}`).
* **output**: Output field to store the parsed JSON object.
* **behavior**: Handles quoted values and spaces within quotes.
