## Sequence Processor

Adds an increasing sequence number to the input object.

## Examples

### Example 1: Start sequence from 0
#### Configuration
```json
"processors": {
	"seq": {
		"type": "sequence",
		"config": {
			"start": 0
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
	"seq": 0
}
```

---

### Example 2: Start sequence from 100
#### Configuration
```json
"processors": {
	"seq": {
		"type": "sequence",
		"config": {
			"start": 100
		}
	}
}
```

#### Input
```json
{
	"originalMessage": "Another test message"
}
```

#### Output
```json
{
	"originalMessage": "Another test message",
	"seq": 100
}
```

---

## Configuration Parameters
* **start**: The starting value for the sequence (default: `0`).
