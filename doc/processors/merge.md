## Merge

Merge several objects into one.

## Examples
Merge two object fields into another one and delete the previous ones:
```json
"processors": {
	"merge": {
		"type": "merge",
		"config": {
			"fields": ["${map}", "${extra}"],
			"output": "entry",
			"delete": ["map", "extra"],
			"deep": true
		}
	}
}
```

### Input
```json
{
	"map": {
		"key1": "value1",
		"key2": "value2"
	},
	"extra": {
		"key3": "value3"
	}
}
```

### Output
```json
{
	"entry": {
		"key1": "value1",
		"key2": "value2",
		"key3": "value3"
	}
}
```

## Configuration parameters
* **fields**: Array of input expressions to merge.
* **output**: Output field to store the merged object.
* **delete**: List of fields to be deleted from the entry after merging.
* **deep**: Boolean indicating whether to perform a deep merge (default: `false`).
