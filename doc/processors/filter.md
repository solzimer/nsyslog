## Filter

Filter and aggregate entries based on key and match expression.
This processor does mainly two things:

* Accept or reject entries based on a filter expression
* Aggregate multiple entries based on a key, so only the aggregated entrie is output

## Examples

Only allow entries with 'event_type' = 'flow'
```json
"processors" : {
	"filter_flow" : {
		"type" : "filter",
		"config" : {
			"mode" : "accept",
			"filter" : "${event_type}=='flow'"
		}
	}
}
```

Aggregate entries by the 'src_ip' field. Output only when 100 entries matching the same
key has been aggregated.
```json
	"aggregate" : {
		"type" : "filter",
		"config" : {
			"mode" : "every",
			"every" : 100,
			"key" : "${src_ip}",
			"output" : "count"
		}
	}
}
```

Aggregate entries by the 'src_ip' field. Output only when 100 entries matching the same
key has been aggregated, or a timeout window (in ms) has been reached
```json
	"aggregate" : {
		"type" : "filter",
		"config" : {
			"mode" : "every",
			"every" : 100,
			"ttl" : 300000,			
			"key" : "${src_ip}",
			"output" : "count"
		}
	}
}
```

Same as before, but now with aggregation stats
```json
"aggregate" : {
	"type" : "filter",
	"config" : {
		"mode" : "every",
		"every" : 100,
		"key" : "${src_ip}",
		"output" : "aggr",
		"aggregate" : {
			"count" : 1,
			"tx_packet" : "${flow.pkts_toserver}",
			"rx_packet" : "${flow.pkts_toclient}",
			"tx_bytes" : "${flow.bytes_toserver}",
			"rx_bytes" : "${flow.bytes_toclient}"
		}
	}
}

```
## Configuration parameters
* **mode** : There are three modes:
	* accept : The entry is accepted as an output if matches the filter.
	* reject : the entry is accepted an an output if doesn't match the filter.
	* every : The entries that matches the filter are aggregated by a key.
* **key** : Expression for the aggregation key.
* **every** : How many entries aggregate before next entry output.
* **ttl** : Timeout (ms) window for an aggregation. When the timeout is reached, the aggregated results for a key will output event if **every** has not been reached.
* **first** : *true* or *false*. If true, the first entry is sent, and the next ones are aggregated.
* **output** : Field to store the aggregation results.
* **aggregate** : Expression object that describes the aggregations to be done.
