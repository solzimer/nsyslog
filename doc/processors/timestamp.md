## Timestamp Processor

The Timestamp Processor places a timestamp in the input object or parses an existing expression into a JavaScript `Date` object or Unix timestamp.

## Examples

### Example 1: Parse a timestamp string
#### Configuration
```json
"processors": {
	"timestamp": {
		"type": "timestamp",
		"config": {
			"input": "${tsstring}",
			"format": "HH:mm:ss YYYY-MM-DD",
			"output": "timestamp"
		}
	}
}
```

#### Input
```json
{
	"tsstring": "12:33:48 2023-03-15"
}
```

#### Output
```json
{
	"tsstring": "12:33:48 2023-03-15",
	"timestamp": "2023-03-15T12:33:48.000Z"
}
```

---

### Example 2: Use the current timestamp
#### Configuration
```json
"processors": {
	"timestamp": {
		"type": "timestamp",
		"config": {
			"output": "currentTimestamp"
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
	"currentTimestamp": "2023-03-15T10:00:00.000Z"
}
```

---

### Example 3: Output as Unix timestamp
#### Configuration
```json
"processors": {
	"timestamp": {
		"type": "timestamp",
		"config": {
			"input": "${tsstring}",
			"format": "YYYY-MM-DD HH:mm:ss",
			"output": "unixTimestamp",
			"unix": true
		}
	}
}
```

#### Input
```json
{
	"tsstring": "2023-03-15 12:33:48"
}
```

#### Output
```json
{
	"tsstring": "2023-03-15 12:33:48",
	"unixTimestamp": 1678884828000
}
```

---

## Configuration Parameters
* **input**: Optional. If specified, the expression to fetch a timestamp string to be parsed. If not specified, the processor will use the current timestamp.
* **format**: If **input** is specified, the format expression of the input to be parsed, following [MomentJS format](https://momentjs.com/docs/#/displaying/format/).
* **output**: The field where the timestamp is stored.
* **unix**: If `true`, the timestamp will be stored as a Unix timestamp (milliseconds since epoch) instead of a JavaScript `Date` object.
