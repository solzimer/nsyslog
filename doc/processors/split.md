## Split Processor

Splits an expression by a delimiter token.

## Examples

### Example 1: Split into an array
#### Configuration
```json
"processors": {
	"split": {
		"type": "split",
		"config": {
			"input": "${originalMessage}",
			"output": "words",
			"separator": " "
		}
	}
}
```

#### Input
```json
{
	"originalMessage": "This is a test message"
}
```

#### Output
```json
{
	"originalMessage": "This is a test message",
	"words": ["This", "is", "a", "test", "message"]
}
```

---

### Example 2: Map split elements to fields
#### Configuration
```json
"processors": {
	"split": {
		"type": "split",
		"config": {
			"input": "${originalMessage}",
			"output": "entry",
			"separator": ";",
			"map": ["header", "host", "port", "source", "url"]
		}
	}
}
```

#### Input
```json
{
	"originalMessage": "HTTP;localhost;8080;app;http://example.com"
}
```

#### Output
```json
{
	"originalMessage": "HTTP;localhost;8080;app;http://example.com",
	"entry": {
		"header": "HTTP",
		"host": "localhost",
		"port": "8080",
		"source": "app",
		"url": "http://example.com"
	}
}
```

---

### Example 3: Process each split item individually
#### Configuration
```json
"processors": {
	"split": {
		"type": "split",
		"config": {
			"input": "${originalMessage}",
			"output": "item",
			"separator": ",",
			"mode": "item"
		}
	}
}
```

#### Input
```json
{
	"originalMessage": "item1,item2,item3"
}
```

#### Output (processed individually)
```json
{
	"originalMessage": "item1,item2,item3",
	"item": "item1"
}
```
```json
{
	"originalMessage": "item1,item2,item3",
	"item": "item2"
}
```
```json
{
	"originalMessage": "item1,item2,item3",
	"item": "item3"
}
```

---

## Configuration Parameters
* **input**: Input expression to extract the value to split (default: `${originalMessage}`).
* **output**: Output field to store the result.
* **separator**: Separator token used to split the input (default: `" "`).
* **map**: List of fields to assign split elements (used in "map" mode).
* **mode**: Mode of splitting:
  - `"array"`: Outputs an array of split elements (default).
  - `"item"`: Processes each split element as a separate entry.
  - `"map"`: Maps split elements to specified fields.
