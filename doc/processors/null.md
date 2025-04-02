## Null Processor

The Null Processor performs no operation on log entries. It simply passes the input entry to the output without any modification.

## Examples

### Example 1: Pass through without changes
#### Configuration
```json
"processors": {
	"nullProcessor": {
		"type": "null",
		"config": {}
	}
}
```

#### Input
```json
{
	"originalMessage": "This is a test message",
	"level": "info"
}
```

#### Output
```json
{
	"originalMessage": "This is a test message",
	"level": "info"
}
```

---

## Configuration Parameters

The `NullProcessor` does not require any configuration parameters.
