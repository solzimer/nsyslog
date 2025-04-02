## Translate Processor

The Translate Processor translates field values using a lookup table. It supports inline mappings, external JSON files, and dynamic expressions.

## Examples

### Example 1: Translate HTTP status codes
#### Configuration
```json
"processors": {
	"trans": {
		"type": "translate",
		"config": {
			"file": "./data/http_codes.json",
			"map": {
				"200": "OK",
				"304": "Redirect",
				"500": "Internal Server Error",
				"*": "Unknown Code"
			},
			"fields": [
				{ "input": "${http.status}", "output": "http.statusString" }
			]
		}
	}
}
```

#### Input
```json
{
	"http": {
		"status": "200"
	}
}
```

#### Output
```json
{
	"http": {
		"status": "200",
		"statusString": "OK"
	}
}
```

---

### Example 2: Default translation for unknown values
#### Configuration
```json
"processors": {
	"trans": {
		"type": "translate",
		"config": {
			"map": {
				"200": "OK",
				"*": "Unknown Code"
			},
			"fields": [
				{ "input": "${http.status}", "output": "http.statusString" }
			]
		}
	}
}
```

#### Input
```json
{
	"http": {
		"status": "404"
	}
}
```

#### Output
```json
{
	"http": {
		"status": "404",
		"statusString": "Unknown Code"
	}
}
```

---

## Configuration Parameters
* **file**: Path to a JSON file containing key/value pairs for translation.
* **map**: Inline map of key/value pairs for translation. Supports dynamic expressions.
* **fields**: Array of field mappings with the following properties:
  - **input**: Expression to extract the input value.
  - **output**: Field to store the translated value.
