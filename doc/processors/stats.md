## Stats Processor

The Stats Processor tracks and logs statistics about flows in log entries. It counts occurrences of each flow and periodically logs the statistics.

## Examples

### Example 1: Log flow statistics at the "info" level
#### Configuration
```json
"processors": {
	"statsProcessor": {
		"type": "stats",
		"config": {
			"level": "info"
		}
	}
}
```

#### Input
```json
{
	"flows": ["flow1", "flow2", "flow1", "flow3"]
}
```

#### Output
```json
{
	"flows": ["flow1", "flow2", "flow1", "flow3"]
}
```

#### Logged Output (after 10 seconds)
```
Flow flow1 => 2
Flow flow2 => 1
Flow flow3 => 1
```

---

## Configuration Parameters
* **level**: The log level to use for reporting statistics (default: `"info"`). Supported levels include `"info"`, `"warn"`, `"error"`, etc.
* **interval**: The processor logs statistics every 10 seconds by default. This interval is not configurable in the current implementation.
