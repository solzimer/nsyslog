## JSON Parser

Parses a JSON expression into an object.

## Examples
```json
"processors": {
	"myjson": {
		"type": "json",
		"config": {
			"output": "jsondata",
			"input": "${jsonline}"
		}
	}
}
```

#### Input and Output (without `unpack`)
**Input JSON string:**
```json
{
	"key1": "value1",
	"key2.subkey": "value2"
}
```

**Output:**
```json
{
	"jsondata": {
		"key1": "value1",
		"key2.subkey": "value2"
	}
}
```

### Example with `unpack`
```json
"processors": {
	"myjson": {
		"type": "json",
		"config": {
			"output": "jsondata",
			"input": "${jsonline}",
			"unpack": true
		}
	}
}
```

#### Input and Output (with `unpack`)
**Input JSON string:**
```json
{
	"key1": "value1",
	"key2.subkey": "value2"
}
```

**Output:**
```json
{
	"jsondata": {
		"key1": "value1",
		"key2": {
			"subkey": "value2"
		}
	}
}
```

## Configuration parameters
* **input**: Expression containing the JSON string to be parsed (default: `${originalMessage}`).
* **output**: Output field to store the parsed JSON object.
* **unpack**: Boolean flag to unpack dot-separated keys in the JSON object into nested objects (default: `false`).
* **error handling**: If the input is not valid JSON, an error will be logged, and the entry will not be modified.
