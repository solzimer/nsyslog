## Filter

The `filter` processor is used to filter and aggregate log entries based on a key and a match expression. It provides the following functionalities:

1. **Accept or reject entries** based on a filter expression.
2. **Aggregate multiple entries** based on a key, outputting only the aggregated result.

## Examples

### Example 1: Accept entries based on a filter
Only allow entries where `event_type` equals `flow`:
```json
"processors": {
	"filter_flow": {
		"type": "filter",
		"config": {
			"mode": "accept",
			"filter": "${event_type}=='flow'"
		}
	}
}
```

### Example 2: Aggregate entries by a key
Aggregate entries by the `src_ip` field. Output only when 100 entries matching the same key have been aggregated:
```json
"processors": {
	"aggregate": {
		"type": "filter",
		"config": {
			"mode": "every",
			"every": 100,
			"key": "${src_ip}",
			"output": "count"
		}
	}
}
```

### Example 3: Aggregate with a timeout
Aggregate entries by the `src_ip` field. Output when 100 entries matching the same key have been aggregated, or after a timeout of 5 minutes (300,000 ms):
```json
"processors": {
	"aggregate": {
		"type": "filter",
		"config": {
			"mode": "every",
			"every": 100,
			"ttl": 300000,
			"key": "${src_ip}",
			"output": "count"
		}
	}
}
```

### Example 4: Aggregation with statistics
Aggregate entries by the `src_ip` field. Output when 100 entries matching the same key have been aggregated, including statistics such as packet and byte counts:
```json
"processors": {
	"aggregate": {
		"type": "filter",
		"config": {
			"mode": "every",
			"every": 100,
			"key": "${src_ip}",
			"output": "aggr",
			"aggregate": {
				"count": 1,
				"tx_packet": "${flow.pkts_toserver}",
				"rx_packet": "${flow.pkts_toclient}",
				"tx_bytes": "${flow.bytes_toserver}",
				"rx_bytes": "${flow.bytes_toclient}"
			}
		}
	}
}
```

## Configuration Parameters

### **mode**
Specifies the processing mode. Possible values:
- **accept**: The entry is accepted as output if it matches the filter.
- **reject**: The entry is accepted as output if it does not match the filter.
- **every**: Entries matching the filter are aggregated by a key.

### **filter**
A JavaScript expression to evaluate whether an entry matches the filter.  
Default: `"true"`.

### **key**
An expression to determine the aggregation key. This is used to group entries for aggregation.

### **every**
Specifies how many entries to aggregate before outputting the next entry.  
Default: `1`.

### **ttl**
Specifies a timeout window (in milliseconds) for aggregation. When the timeout is reached, the aggregated results for a key are output even if the `every` condition has not been met.  
Default: `0` (no timeout).

### **first**
Determines whether the first entry in a group is output immediately.  
- **true**: The first entry is sent immediately, and subsequent entries are aggregated.  
- **false**: The processor waits until the `every` condition is met before outputting.  
Default: `true`.

### **output**
The field where the aggregation results are stored.

### **aggregate**
An object describing the aggregations to be performed. Each key in the object represents a field in the output, and its value is an expression to calculate the aggregated value.  
Example:
```json
"aggregate": {
	"count": 1,
	"tx_packet": "${flow.pkts_toserver}",
	"rx_packet": "${flow.pkts_toclient}"
}
```

## Notes
- The `filter` processor is highly flexible and can be used for both simple filtering and complex aggregation scenarios.
- When using the `every` mode with a `ttl`, ensure that the timeout value is appropriate for your use case to avoid premature or delayed outputs.
