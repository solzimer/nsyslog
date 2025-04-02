## Throttle Processor

The Throttle Processor limits the rate at which log entries are processed. It buffers log entries and processes them at a fixed interval.

## Examples

### Example 1: Throttle log entries with a 1-second interval
#### Configuration
```json
"processors": {
	"throttle": {
		"type": "throttle",
		"config": {
			"timeout": 1000
		}
	}
}
```

#### Input
```json
[
	{ "originalMessage": "Message 1" },
	{ "originalMessage": "Message 2" },
	{ "originalMessage": "Message 3" }
]
```

#### Output (processed one entry per second)
```json
{ "originalMessage": "Message 1" }
```
```json
{ "originalMessage": "Message 2" }
```
```json
{ "originalMessage": "Message 3" }
```

---

### Example 2: No throttling
#### Configuration
```json
"processors": {
	"throttle": {
		"type": "throttle",
		"config": {
			"timeout": 0
		}
	}
}
```

#### Input
```json
[
	{ "originalMessage": "Message 1" },
	{ "originalMessage": "Message 2" },
	{ "originalMessage": "Message 3" }
]
```

#### Output (processed immediately)
```json
{ "originalMessage": "Message 1" }
```
```json
{ "originalMessage": "Message 2" }
```
```json
{ "originalMessage": "Message 3" }
```

---

## Configuration Parameters
* **timeout**: The interval in milliseconds to process buffered entries. If set to `0`, throttling is disabled, and entries are processed immediately.
